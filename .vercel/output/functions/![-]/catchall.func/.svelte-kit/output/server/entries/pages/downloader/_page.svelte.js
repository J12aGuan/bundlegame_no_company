import { W as attr } from "../../../chunks/utils2.js";
import "../../../chunks/app.js";
import "firebase/app";
import "firebase/analytics";
import "firebase/firestore";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let password = "";
    $$renderer2.push(`<div class="space-y-4 max-w-sm mx-auto mt-8 text-center">`);
    {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<input type="password"${attr("value", password)} placeholder="Enter password" class="border p-2 rounded w-full"/> <button class="bg-blue-500 text-white px-4 py-2 rounded">Submit</button>`);
    }
    $$renderer2.push(`<!--]--> `);
    {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div>`);
  });
}
export {
  _page as default
};
