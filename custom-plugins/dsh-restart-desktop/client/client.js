window.__ModuleLoader__.load({
  id: "dsh-restart-desktop",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var react = require("react");
    /**
     * dsh-restart-desktop — client half.
     *
     * Renders a "重启 DSH / Restart DSH" action in Settings → General. On click
     * it POSTs to the host route `/restart-desktop`, which triggers an Electron
     * relaunch (restart-free for the profile) that reloads every plugin bundle.
     *
     * @module dsh-restart-desktop/client
     */
    var name = "dsh-restart-desktop";
    var inject = ["slots"];
    var NS = "dsh-restart-desktop";

    var styles = {
      button: {
        padding: "6px 14px",
        borderRadius: "6px",
        border: "1px solid transparent",
        background: "var(--dsw-alias-button-primary-fill, #4a6cf7)",
        color: "var(--dsw-alias-label-primary-foreground, #fff)",
        cursor: "pointer",
        fontSize: "13px"
      },
      disabled: {
        opacity: 0.5,
        cursor: "default"
      }
    };

    function RestartDesktopAction() {
      var _a = (0, react.useState)(false),
        busy = _a[0],
        setBusy = _a[1];
      var _b = (0, react.useState)(null),
        error = _b[0],
        setError = _b[1];

      var onClick = function () {
        setBusy(true);
        setError(null);
        fetch("/restart-desktop", { method: "POST" })
          .then(function (r) {
            return r.json();
          })
          .then(function (data) {
            if (!data.ok) setError(data.message || "重启失败");
            // success: electron relaunches this window automatically
          })
          .catch(function (e) {
            setError(String(e));
          })
          .finally(function () {
            setBusy(false);
          });
      };

      return (0, react.createElement)(
        "div",
        null,
        (0, react.createElement)(
          "button",
          {
            style: busy ? Object.assign({}, styles.button, styles.disabled) : styles.button,
            disabled: busy,
            onClick: onClick
          },
          busy ? "正在重启 DSH…" : "重启 DSH（加载插件）"
        ),
        error !== null &&
          (0, react.createElement)(
            "div",
            { style: { color: "var(--dsw-alias-state-error-primary, #d9534f)", fontSize: "12px", marginTop: "6px" } },
            error
          )
      );
    }

    function apply(ctx) {
      var slots = ctx.get("slots");
      if (slots === void 0) return;
      ctx.effect(
        () =>
          slots.inject("settings.action", () =>
            slots.register(
              {
                name: "settings.action",
                id: "restart-desktop",
                order: 1000,
                label: () => "重启 DSH / Restart DSH"
              },
              function () {
                return (0, react.createElement)(RestartDesktopAction, {});
              }
            )
          ),
        NS + ": settings action"
      );
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.name = name;
    return module.exports;
  }
});
