/** Parser-executed head script: restore the choice before any themed content paints. */
export default function ThemeInit() {
  return <script id="theme-init" dangerouslySetInnerHTML={{ __html: `
    (function () {
      var dark = false;
      try {
        dark = localStorage.getItem("theme") === "dark";
      } catch (_) {}
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
      var color = getComputedStyle(document.documentElement).getPropertyValue("--browser-chrome-bg").trim()
        || (dark ? "#191316" : "#fffefb");
      document.querySelectorAll('meta[name="theme-color"]').forEach(function (meta) {
        meta.setAttribute("content", color);
      });
    })();
  ` }} />;
}
