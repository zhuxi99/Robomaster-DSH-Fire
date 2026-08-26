#!/usr/bin/env python3
"""validate_settings.py — settings.yaml / settings.yaml.template 语法与脱敏校验器（Python 版）

用法：
    python validate_settings.py                        # 校验 ~/.dsh/settings.yaml
    python validate_settings.py settings.yaml.template # 校验指定文件
    python validate_settings.py a.yaml b.yaml          # 批量校验

退出码：0 = 全部通过；1 = 存在错误。

与 validate-settings.mjs 规则编号一一对应（E001..E005 / E1xx / W0xx），
两个实现可互相替代：Windows 队友有 Node 就跑 .mjs，有 Python 就跑本脚本。
本脚本不打印任何字段值，只打印键名、行号和规则编号。
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

PLACEHOLDER_RE = re.compile(r"^<FILL[-_]?IN>$", re.IGNORECASE)

# 允许出现 <FILL-IN> 的键名（小写比较），与 sanitize-settings.mjs 的白名单保持同步
SENSITIVE_KEYS = {
    "apikey", "apikeyenv", "api_key", "apisecret", "api_secret",
    "token", "accesstoken", "authtoken", "refreshtoken", "sessiontoken",
    "secret", "clientsecret", "password", "passwd",
    "credential", "credentials", "cookie", "bearer", "storagestatepath",
}

NUMERIC_KEYS = {"contextwindow", "maxtokens"}

KEY_LINE_RE = re.compile(r"""^([ \t]*)(-[ \t]+)?(["']?)([A-Za-z0-9_.\-/]+)\3[ \t]*:(.*)$""")
LIST_ITEM_RE = re.compile(r"^-[ \t]+(.*)$")
INT_RE = re.compile(r"^-?\d+$")


def is_sensitive(key: str) -> bool:
    return key.lower() in SENSITIVE_KEYS


def lint_text(text: str):
    """文本层校验：零依赖。返回 (errors, warnings)。"""
    errors: list[str] = []
    warnings: list[str] = []
    lines = text.splitlines()

    for i, line in enumerate(lines):
        no = i + 1
        trimmed = line.strip()
        if not trimmed or trimmed.startswith("#"):
            continue

        if PLACEHOLDER_RE.match(trimmed):
            errors.append(
                f'E001 第 {no} 行：无 key 的裸占位标量'
                f'（会触发 "Implicit keys need to be on a single line"）'
            )
            continue

        if line.startswith("\t") or re.match(r"^ *\t", line):
            errors.append(f"E002 第 {no} 行：使用了 Tab 缩进，YAML 不允许")

        m = KEY_LINE_RE.match(line)
        rest = m.group(5).strip() if m else None

        bare_value = rest
        if bare_value is None:
            li = LIST_ITEM_RE.match(trimmed)
            bare_value = li.group(1).strip() if li else None
        if bare_value and bare_value.startswith("%"):
            errors.append(
                f"E003 第 {no} 行：值以 % 开头且未加引号（YAML 保留指令字符），应写成 \"...\" 形式"
            )

        if m:
            key = m.group(4)
            if rest and PLACEHOLDER_RE.match(rest) and not is_sensitive(key):
                errors.append(f"E004 第 {no} 行：占位符落在非敏感键 {key} 上（脱敏规则误伤）")
            if key.lower() in NUMERIC_KEYS and rest and not INT_RE.match(rest):
                errors.append(f"E005 第 {no} 行：{key} 必须是整数")
            if is_sensitive(key) and rest == "":
                nxt = lines[i + 1] if i + 1 < len(lines) else ""
                own_indent = len(m.group(1)) + len(m.group(2) or "")
                nxt_indent = len(nxt) - len(nxt.lstrip(" "))
                if nxt.strip() and nxt_indent <= own_indent:
                    warnings.append(f"W001 第 {no} 行：敏感键 {key} 值为空")

    if "\r\n" in text and re.search(r"(?<!\r)\n", text):
        warnings.append("W002 文件混用 CRLF 与 LF 换行")
    return errors, warnings


def _walk(node, path, visit):
    if isinstance(node, dict):
        for k, v in node.items():
            _walk(v, path + [str(k)], visit)
    elif isinstance(node, list):
        for idx, v in enumerate(node):
            _walk(v, path + [str(idx)], visit)
    else:
        visit(path, node)


def lint_document(text: str):
    """文档层校验：需要 PyYAML。返回 (available, errors, warnings, provider_count)。"""
    try:
        import yaml  # type: ignore
    except ImportError:
        return False, [], ["W003 未安装 PyYAML，已跳过严格解析（仅文本层校验）"], None

    errors: list[str] = []
    warnings: list[str] = []
    try:
        data = yaml.safe_load(text)
    except yaml.YAMLError as exc:
        return True, [f"E100 YAML 解析失败：{exc}"], warnings, None

    if not isinstance(data, dict):
        return True, ["E102 顶层必须是 mapping"], warnings, None

    def visit(path, value):
        leaf = path[-1] if path else ""
        if isinstance(value, str) and PLACEHOLDER_RE.match(value.strip()) and not is_sensitive(leaf):
            errors.append(f"E103 占位符落在非敏感键上：{'.'.join(path)}")
        if leaf.lower() in NUMERIC_KEYS and value is not None and not isinstance(value, int):
            errors.append(f"E104 {'.'.join(path)} 必须是数字")

    _walk(data, [], visit)

    providers = (data.get("llm-pi-ai") or {}).get("providers") if isinstance(data.get("llm-pi-ai"), dict) else None
    count = None
    if isinstance(providers, dict):
        count = len(providers)
        for pid, p in providers.items():
            if not isinstance(p, dict):
                errors.append(f"E105 provider {pid} 不是 mapping（脱敏很可能吞掉了它的子键）")
                continue
            for req in ("displayName", "api"):
                if req not in p:
                    warnings.append(f"W004 provider {pid} 缺少 {req}")
            if isinstance(p.get("models"), list):
                for idx, mdl in enumerate(p["models"]):
                    if not isinstance(mdl, dict) or "id" not in mdl:
                        warnings.append(f"W005 provider {pid} models[{idx}] 缺少 id")
    else:
        warnings.append("W006 未找到 llm-pi-ai.providers")

    return True, errors, warnings, count


def validate_file(path: Path):
    text = path.read_text(encoding="utf-8")
    t_err, t_warn = lint_text(text)
    strict, d_err, d_warn, count = lint_document(text)
    return {
        "file": str(path),
        "ok": not t_err and not d_err,
        "errors": t_err + d_err,
        "warnings": t_warn + d_warn,
        "strict": strict,
        "providerCount": count,
    }


def main(argv: list[str]) -> int:
    targets = [Path(a).resolve() for a in argv] or [Path.home() / ".dsh" / "settings.yaml"]
    failed = 0
    for path in targets:
        try:
            r = validate_file(path)
        except OSError as exc:
            print(f"❌ {path}\n   E000 无法读取：{exc}", file=sys.stderr)
            failed += 1
            continue
        mode = "strict yaml + text lint" if r["strict"] else "text lint only"
        if r["ok"]:
            extra = f"  providers={r['providerCount']}" if r["providerCount"] is not None else ""
            print(f"✅ {r['file']}  [{mode}]{extra}")
        else:
            failed += 1
            print(f"❌ {r['file']}  [{mode}]", file=sys.stderr)
            for e in r["errors"]:
                print(f"   {e}", file=sys.stderr)
        for w in r["warnings"]:
            print(f"   ⚠️  {w}", file=sys.stderr)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
