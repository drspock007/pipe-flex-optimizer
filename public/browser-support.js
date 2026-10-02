/* Runs before the React module so an older browser can still see the warning. */
(function () {
  var ua = navigator.userAgent || "";
  var platform = navigator.platform || "";
  var ios = /iPhone|iPad|iPod/.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var match;
  var name;
  var version;
  var recommended;
  var technical;
  var minimumName;

  if (ios) {
    match = /OS (\d+)[._](\d+)/.exec(ua) || /Version\/(\d+)\.(\d+)/.exec(ua);
    name = /CriOS\//.test(ua) ? "Chrome on iOS" : /EdgiOS\//.test(ua) ? "Edge on iOS" : /FxiOS\//.test(ua) ? "Firefox on iOS" : "Safari on iOS/iPadOS";
    minimumName = "iOS/iPadOS Safari";
    technical = [15, 4];
    recommended = [16, 4];
  } else if ((match = /Edg(?:A)?\/(\d+)(?:\.(\d+))?/.exec(ua))) {
    name = "Edge";
    technical = [108, 0];
    recommended = [120, 0];
  } else if ((match = /(?:Chrome|Chromium)\/(\d+)(?:\.(\d+))?/.exec(ua)) && !/OPR\//.test(ua)) {
    name = /Android/.test(ua) ? "Chrome Android" : "Chrome";
    technical = [108, 0];
    recommended = [120, 0];
  } else if ((match = /Firefox\/(\d+)(?:\.(\d+))?/.exec(ua))) {
    name = "Firefox";
    technical = [121, 0];
    recommended = [122, 0];
  } else if ((match = /Version\/(\d+)(?:\.(\d+))?.*Safari\//.exec(ua))) {
    name = "Safari";
    technical = [15, 4];
    recommended = [16, 4];
  }

  if (!match) return; // Unknown or masked UA: no unsupported claim can be made.
  version = [Number(match[1]), Number(match[2] || 0)];
  if (version[0] > recommended[0] || (version[0] === recommended[0] && version[1] >= recommended[1])) return;

  var belowTechnical = version[0] < technical[0] || (version[0] === technical[0] && version[1] < technical[1]);
  var required = recommended[0] + (recommended[1] ? "." + recommended[1] : "") + "+";
  var detected = name + " " + version[0] + "." + version[1];
  var message = belowTechnical
    ? " may not run this application correctly."
    : " is below our recommended version; some features may not work reliably.";

  function showWarning() {
    var root = document.getElementById("root");
    if (!root || !root.parentNode) return;
    var banner = document.createElement("aside");
    banner.setAttribute("role", "alert");
    banner.setAttribute("aria-label", "Browser compatibility warning");
    banner.style.cssText = "box-sizing:border-box;padding:12px 20px;background:#fff4db;color:#32200b;border-bottom:2px solid #ff9305;font:16px/1.5 Arial,sans-serif;";

    var strong = document.createElement("strong");
    strong.appendChild(document.createTextNode("Browser compatibility warning. "));
    banner.appendChild(strong);
    banner.appendChild(document.createTextNode("Detected " + detected + ". This version" + message + " Use " + (minimumName || name) + " " + required + " or another recommended browser. "));

    var link = document.createElement("a");
    link.href = "/help#browser-compatibility";
    link.style.cssText = "color:#704000;text-decoration:underline;";
    link.appendChild(document.createTextNode("See supported browsers"));
    banner.appendChild(link);
    root.parentNode.insertBefore(banner, root);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showWarning);
  else showWarning();
}());
