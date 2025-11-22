import { K as attr, C as pop, z as push } from "../../../chunks/index.js";
import "../../../chunks/app.js";
import "firebase/firestore";
function _page($$payload, $$props) {
  push();
  let password = "";
  $$payload.out += `<div class="space-y-4 max-w-sm mx-auto mt-8 text-center">`;
  {
    $$payload.out += "<!--[-->";
    $$payload.out += `<input type="password"${attr("value", password)} placeholder="Enter password" class="border p-2 rounded w-full"> <button class="bg-blue-500 text-white px-4 py-2 rounded">Submit</button>`;
  }
  $$payload.out += `<!--]--> `;
  {
    $$payload.out += "<!--[!-->";
  }
  $$payload.out += `<!--]--></div>`;
  pop();
}
export {
  _page as default
};
