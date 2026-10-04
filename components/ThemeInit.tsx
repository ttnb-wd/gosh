/** Parser-executed head script: restore the choice before any themed content paints. */
export default function ThemeInit() {
  return <script id="theme-init" dangerouslySetInnerHTML={{ __html: `
    (function () {
      try {
        var dark = localStorage.getItem("theme") === "dark";
        document.documentElement.classList.toggle("dark", dark);
        document.documentElement.style.colorScheme = dark ? "dark" : "light";
      } catch (_) {}
    })();
  ` }} />;
}
