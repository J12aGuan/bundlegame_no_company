import{M as Js,aC as Xu,aD as Ju,aE as Zu,aF as eh,aG as th,aH as nh,u as rh,ax as sh}from"./DtNr4EEN.js";import{b as ih,l as oh}from"./D_PDG52N.js";import{_ as ln}from"./Dp1pzeXC.js";import{d as Zs,g as ie,w as Se}from"./CetyYWOR.js";const ah=Symbol("is custom element"),lh=Symbol("is html");function zp(n){if(Js){var e=!1,t=()=>{if(!e){if(e=!0,n.hasAttribute("value")){var r=n.value;Ko(n,"value",null),n.value=r}if(n.hasAttribute("checked")){var s=n.checked;Ko(n,"checked",null),n.checked=s}}};n.__on_r=t,Xu(t),ih()}}function Ko(n,e,t,r){var s=ch(n);Js&&(s[e]=n.getAttribute(e),e==="src"||e==="srcset"||e==="href"&&n.nodeName==="LINK")||s[e]!==(s[e]=t)&&(e==="loading"&&(n[Ju]=t),t==null?n.removeAttribute(e):typeof t!="string"&&uh(n).includes(e)?n[e]=t:n.setAttribute(e,t))}function ch(n){return n.__attributes??(n.__attributes={[ah]:n.nodeName.includes("-"),[lh]:n.namespaceURI===Zu})}var Ho=new Map;function uh(n){var e=Ho.get(n.nodeName);if(e)return e;Ho.set(n.nodeName,e=[]);for(var t,r=n,s=Element.prototype;s!==r;){t=th(r);for(var o in t)t[o].set&&e.push(o);r=eh(r)}return e}function jp(n,e,t=e){var r=nh();oh(n,"input",s=>{var o=s?n.defaultValue:n.value;if(o=fs(n)?ms(o):o,t(o),r&&o!==(o=e())){var a=n.selectionStart,c=n.selectionEnd;n.value=o??"",c!==null&&(n.selectionStart=a,n.selectionEnd=Math.min(c,n.value.length))}}),(Js&&n.defaultValue!==n.value||rh(e)==null&&n.value)&&t(fs(n)?ms(n.value):n.value),sh(()=>{var s=e();fs(n)&&s===ms(n.value)||n.type==="date"&&!s&&!n.value||s!==n.value&&(n.value=s??"")})}function fs(n){var e=n.type;return e==="number"||e==="range"}function ms(n){return n===""?null:+n}var Wo={};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sl=function(n){const e=[];let t=0;for(let r=0;r<n.length;r++){let s=n.charCodeAt(r);s<128?e[t++]=s:s<2048?(e[t++]=s>>6|192,e[t++]=s&63|128):(s&64512)===55296&&r+1<n.length&&(n.charCodeAt(r+1)&64512)===56320?(s=65536+((s&1023)<<10)+(n.charCodeAt(++r)&1023),e[t++]=s>>18|240,e[t++]=s>>12&63|128,e[t++]=s>>6&63|128,e[t++]=s&63|128):(e[t++]=s>>12|224,e[t++]=s>>6&63|128,e[t++]=s&63|128)}return e},hh=function(n){const e=[];let t=0,r=0;for(;t<n.length;){const s=n[t++];if(s<128)e[r++]=String.fromCharCode(s);else if(s>191&&s<224){const o=n[t++];e[r++]=String.fromCharCode((s&31)<<6|o&63)}else if(s>239&&s<365){const o=n[t++],a=n[t++],c=n[t++],h=((s&7)<<18|(o&63)<<12|(a&63)<<6|c&63)-65536;e[r++]=String.fromCharCode(55296+(h>>10)),e[r++]=String.fromCharCode(56320+(h&1023))}else{const o=n[t++],a=n[t++];e[r++]=String.fromCharCode((s&15)<<12|(o&63)<<6|a&63)}}return e.join("")},il={byteToCharMap_:null,charToByteMap_:null,byteToCharMapWebSafe_:null,charToByteMapWebSafe_:null,ENCODED_VALS_BASE:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",get ENCODED_VALS(){return this.ENCODED_VALS_BASE+"+/="},get ENCODED_VALS_WEBSAFE(){return this.ENCODED_VALS_BASE+"-_."},HAS_NATIVE_SUPPORT:typeof atob=="function",encodeByteArray(n,e){if(!Array.isArray(n))throw Error("encodeByteArray takes an array as a parameter");this.init_();const t=e?this.byteToCharMapWebSafe_:this.byteToCharMap_,r=[];for(let s=0;s<n.length;s+=3){const o=n[s],a=s+1<n.length,c=a?n[s+1]:0,h=s+2<n.length,d=h?n[s+2]:0,m=o>>2,w=(o&3)<<4|c>>4;let A=(c&15)<<2|d>>6,b=d&63;h||(b=64,a||(A=64)),r.push(t[m],t[w],t[A],t[b])}return r.join("")},encodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?btoa(n):this.encodeByteArray(sl(n),e)},decodeString(n,e){return this.HAS_NATIVE_SUPPORT&&!e?atob(n):hh(this.decodeStringToByteArray(n,e))},decodeStringToByteArray(n,e){this.init_();const t=e?this.charToByteMapWebSafe_:this.charToByteMap_,r=[];for(let s=0;s<n.length;){const o=t[n.charAt(s++)],c=s<n.length?t[n.charAt(s)]:0;++s;const d=s<n.length?t[n.charAt(s)]:64;++s;const w=s<n.length?t[n.charAt(s)]:64;if(++s,o==null||c==null||d==null||w==null)throw new dh;const A=o<<2|c>>4;if(r.push(A),d!==64){const b=c<<4&240|d>>2;if(r.push(b),w!==64){const k=d<<6&192|w;r.push(k)}}}return r},init_(){if(!this.byteToCharMap_){this.byteToCharMap_={},this.charToByteMap_={},this.byteToCharMapWebSafe_={},this.charToByteMapWebSafe_={};for(let n=0;n<this.ENCODED_VALS.length;n++)this.byteToCharMap_[n]=this.ENCODED_VALS.charAt(n),this.charToByteMap_[this.byteToCharMap_[n]]=n,this.byteToCharMapWebSafe_[n]=this.ENCODED_VALS_WEBSAFE.charAt(n),this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[n]]=n,n>=this.ENCODED_VALS_BASE.length&&(this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(n)]=n,this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(n)]=n)}}};class dh extends Error{constructor(){super(...arguments),this.name="DecodeBase64StringError"}}const _h=function(n){const e=sl(n);return il.encodeByteArray(e,!0)},_r=function(n){return _h(n).replace(/\./g,"")},fh=function(n){try{return il.decodeString(n,!0)}catch(e){console.error("base64Decode failed: ",e)}return null};/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function mh(){if(typeof self<"u")return self;if(typeof window<"u")return window;if(typeof global<"u")return global;throw new Error("Unable to locate global object.")}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gh=()=>mh().__FIREBASE_DEFAULTS__,ph=()=>{if(typeof process>"u"||typeof Wo>"u")return;const n=Wo.__FIREBASE_DEFAULTS__;if(n)return JSON.parse(n)},yh=()=>{if(typeof document>"u")return;let n;try{n=document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/)}catch{return}const e=n&&fh(n[1]);return e&&JSON.parse(e)},ei=()=>{try{return gh()||ph()||yh()}catch(n){console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${n}`);return}},vh=n=>{var e,t;return(t=(e=ei())===null||e===void 0?void 0:e.emulatorHosts)===null||t===void 0?void 0:t[n]},Eh=n=>{const e=vh(n);if(!e)return;const t=e.lastIndexOf(":");if(t<=0||t+1===e.length)throw new Error(`Invalid host ${e} with no separate hostname and port!`);const r=parseInt(e.substring(t+1),10);return e[0]==="["?[e.substring(1,t-1),r]:[e.substring(0,t),r]},ol=()=>{var n;return(n=ei())===null||n===void 0?void 0:n.config};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Th{constructor(){this.reject=()=>{},this.resolve=()=>{},this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}wrapCallback(e){return(t,r)=>{t?this.reject(t):this.resolve(r),typeof e=="function"&&(this.promise.catch(()=>{}),e.length===1?e(t):e(t,r))}}}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Rh(n,e){if(n.uid)throw new Error('The "uid" field is no longer supported by mockUserToken. Please use "sub" instead for Firebase Auth User ID.');const t={alg:"none",type:"JWT"},r=e||"demo-project",s=n.iat||0,o=n.sub||n.user_id;if(!o)throw new Error("mockUserToken must contain 'sub' or 'user_id' field!");const a=Object.assign({iss:`https://securetoken.google.com/${r}`,aud:r,iat:s,exp:s+3600,auth_time:s,sub:o,user_id:o,firebase:{sign_in_provider:"custom",identities:{}}},n);return[_r(JSON.stringify(t)),_r(JSON.stringify(a)),""].join(".")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function wh(){return typeof navigator<"u"&&typeof navigator.userAgent=="string"?navigator.userAgent:""}function Ah(){var n;const e=(n=ei())===null||n===void 0?void 0:n.forceEnvironment;if(e==="node")return!0;if(e==="browser")return!1;try{return Object.prototype.toString.call(global.process)==="[object process]"}catch{return!1}}function Ih(){const n=typeof chrome=="object"?chrome.runtime:typeof browser=="object"?browser.runtime:void 0;return typeof n=="object"&&n.id!==void 0}function bh(){return!Ah()&&!!navigator.userAgent&&navigator.userAgent.includes("Safari")&&!navigator.userAgent.includes("Chrome")}function al(){try{return typeof indexedDB=="object"}catch{return!1}}function ll(){return new Promise((n,e)=>{try{let t=!0;const r="validate-browser-context-for-indexeddb-analytics-module",s=self.indexedDB.open(r);s.onsuccess=()=>{s.result.close(),t||self.indexedDB.deleteDatabase(r),n(!0)},s.onupgradeneeded=()=>{t=!1},s.onerror=()=>{var o;e(((o=s.error)===null||o===void 0?void 0:o.message)||"")}}catch(t){e(t)}})}function Sh(){return!(typeof navigator>"u"||!navigator.cookieEnabled)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ch="FirebaseError";class lt extends Error{constructor(e,t,r){super(t),this.code=e,this.customData=r,this.name=Ch,Object.setPrototypeOf(this,lt.prototype),Error.captureStackTrace&&Error.captureStackTrace(this,Ar.prototype.create)}}class Ar{constructor(e,t,r){this.service=e,this.serviceName=t,this.errors=r}create(e,...t){const r=t[0]||{},s=`${this.service}/${e}`,o=this.errors[e],a=o?Ph(o,r):"Error",c=`${this.serviceName}: ${a} (${s}).`;return new lt(s,c,r)}}function Ph(n,e){return n.replace(Dh,(t,r)=>{const s=e[r];return s!=null?String(s):`<${r}?>`})}const Dh=/\{\$([^}]+)}/g;function Ds(n,e){if(n===e)return!0;const t=Object.keys(n),r=Object.keys(e);for(const s of t){if(!r.includes(s))return!1;const o=n[s],a=e[s];if(Qo(o)&&Qo(a)){if(!Ds(o,a))return!1}else if(o!==a)return!1}for(const s of r)if(!t.includes(s))return!1;return!0}function Qo(n){return n!==null&&typeof n=="object"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const kh=1e3,Vh=2,Bh=14400*1e3,Nh=.5;function Yo(n,e=kh,t=Vh){const r=e*Math.pow(t,n),s=Math.round(Nh*r*(Math.random()-.5)*2);return Math.min(Bh,r+s)}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function $e(n){return n&&n._delegate?n._delegate:n}class Ge{constructor(e,t,r){this.name=e,this.instanceFactory=t,this.type=r,this.multipleInstances=!1,this.serviceProps={},this.instantiationMode="LAZY",this.onInstanceCreated=null}setInstantiationMode(e){return this.instantiationMode=e,this}setMultipleInstances(e){return this.multipleInstances=e,this}setServiceProps(e){return this.serviceProps=e,this}setInstanceCreatedCallback(e){return this.onInstanceCreated=e,this}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ft="[DEFAULT]";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Oh{constructor(e,t){this.name=e,this.container=t,this.component=null,this.instances=new Map,this.instancesDeferred=new Map,this.instancesOptions=new Map,this.onInitCallbacks=new Map}get(e){const t=this.normalizeInstanceIdentifier(e);if(!this.instancesDeferred.has(t)){const r=new Th;if(this.instancesDeferred.set(t,r),this.isInitialized(t)||this.shouldAutoInitialize())try{const s=this.getOrInitializeService({instanceIdentifier:t});s&&r.resolve(s)}catch{}}return this.instancesDeferred.get(t).promise}getImmediate(e){var t;const r=this.normalizeInstanceIdentifier(e==null?void 0:e.identifier),s=(t=e==null?void 0:e.optional)!==null&&t!==void 0?t:!1;if(this.isInitialized(r)||this.shouldAutoInitialize())try{return this.getOrInitializeService({instanceIdentifier:r})}catch(o){if(s)return null;throw o}else{if(s)return null;throw Error(`Service ${this.name} is not available`)}}getComponent(){return this.component}setComponent(e){if(e.name!==this.name)throw Error(`Mismatching Component ${e.name} for Provider ${this.name}.`);if(this.component)throw Error(`Component for ${this.name} has already been provided`);if(this.component=e,!!this.shouldAutoInitialize()){if(xh(e))try{this.getOrInitializeService({instanceIdentifier:ft})}catch{}for(const[t,r]of this.instancesDeferred.entries()){const s=this.normalizeInstanceIdentifier(t);try{const o=this.getOrInitializeService({instanceIdentifier:s});r.resolve(o)}catch{}}}}clearInstance(e=ft){this.instancesDeferred.delete(e),this.instancesOptions.delete(e),this.instances.delete(e)}async delete(){const e=Array.from(this.instances.values());await Promise.all([...e.filter(t=>"INTERNAL"in t).map(t=>t.INTERNAL.delete()),...e.filter(t=>"_delete"in t).map(t=>t._delete())])}isComponentSet(){return this.component!=null}isInitialized(e=ft){return this.instances.has(e)}getOptions(e=ft){return this.instancesOptions.get(e)||{}}initialize(e={}){const{options:t={}}=e,r=this.normalizeInstanceIdentifier(e.instanceIdentifier);if(this.isInitialized(r))throw Error(`${this.name}(${r}) has already been initialized`);if(!this.isComponentSet())throw Error(`Component ${this.name} has not been registered yet`);const s=this.getOrInitializeService({instanceIdentifier:r,options:t});for(const[o,a]of this.instancesDeferred.entries()){const c=this.normalizeInstanceIdentifier(o);r===c&&a.resolve(s)}return s}onInit(e,t){var r;const s=this.normalizeInstanceIdentifier(t),o=(r=this.onInitCallbacks.get(s))!==null&&r!==void 0?r:new Set;o.add(e),this.onInitCallbacks.set(s,o);const a=this.instances.get(s);return a&&e(a,s),()=>{o.delete(e)}}invokeOnInitCallbacks(e,t){const r=this.onInitCallbacks.get(t);if(r)for(const s of r)try{s(e,t)}catch{}}getOrInitializeService({instanceIdentifier:e,options:t={}}){let r=this.instances.get(e);if(!r&&this.component&&(r=this.component.instanceFactory(this.container,{instanceIdentifier:Mh(e),options:t}),this.instances.set(e,r),this.instancesOptions.set(e,t),this.invokeOnInitCallbacks(r,e),this.component.onInstanceCreated))try{this.component.onInstanceCreated(this.container,e,r)}catch{}return r||null}normalizeInstanceIdentifier(e=ft){return this.component?this.component.multipleInstances?e:ft:e}shouldAutoInitialize(){return!!this.component&&this.component.instantiationMode!=="EXPLICIT"}}function Mh(n){return n===ft?void 0:n}function xh(n){return n.instantiationMode==="EAGER"}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fh{constructor(e){this.name=e,this.providers=new Map}addComponent(e){const t=this.getProvider(e.name);if(t.isComponentSet())throw new Error(`Component ${e.name} has already been registered with ${this.name}`);t.setComponent(e)}addOrOverwriteComponent(e){this.getProvider(e.name).isComponentSet()&&this.providers.delete(e.name),this.addComponent(e)}getProvider(e){if(this.providers.has(e))return this.providers.get(e);const t=new Oh(e,this);return this.providers.set(e,t),t}getProviders(){return Array.from(this.providers.values())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var z;(function(n){n[n.DEBUG=0]="DEBUG",n[n.VERBOSE=1]="VERBOSE",n[n.INFO=2]="INFO",n[n.WARN=3]="WARN",n[n.ERROR=4]="ERROR",n[n.SILENT=5]="SILENT"})(z||(z={}));const Lh={debug:z.DEBUG,verbose:z.VERBOSE,info:z.INFO,warn:z.WARN,error:z.ERROR,silent:z.SILENT},Uh=z.INFO,zh={[z.DEBUG]:"log",[z.VERBOSE]:"log",[z.INFO]:"info",[z.WARN]:"warn",[z.ERROR]:"error"},jh=(n,e,...t)=>{if(e<n.logLevel)return;const r=new Date().toISOString(),s=zh[e];if(s)console[s](`[${r}]  ${n.name}:`,...t);else throw new Error(`Attempted to log a message with an invalid logType (value: ${e})`)};class ti{constructor(e){this.name=e,this._logLevel=Uh,this._logHandler=jh,this._userLogHandler=null}get logLevel(){return this._logLevel}set logLevel(e){if(!(e in z))throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);this._logLevel=e}setLogLevel(e){this._logLevel=typeof e=="string"?Lh[e]:e}get logHandler(){return this._logHandler}set logHandler(e){if(typeof e!="function")throw new TypeError("Value assigned to `logHandler` must be a function");this._logHandler=e}get userLogHandler(){return this._userLogHandler}set userLogHandler(e){this._userLogHandler=e}debug(...e){this._userLogHandler&&this._userLogHandler(this,z.DEBUG,...e),this._logHandler(this,z.DEBUG,...e)}log(...e){this._userLogHandler&&this._userLogHandler(this,z.VERBOSE,...e),this._logHandler(this,z.VERBOSE,...e)}info(...e){this._userLogHandler&&this._userLogHandler(this,z.INFO,...e),this._logHandler(this,z.INFO,...e)}warn(...e){this._userLogHandler&&this._userLogHandler(this,z.WARN,...e),this._logHandler(this,z.WARN,...e)}error(...e){this._userLogHandler&&this._userLogHandler(this,z.ERROR,...e),this._logHandler(this,z.ERROR,...e)}}const qh=(n,e)=>e.some(t=>n instanceof t);let Xo,Jo;function $h(){return Xo||(Xo=[IDBDatabase,IDBObjectStore,IDBIndex,IDBCursor,IDBTransaction])}function Gh(){return Jo||(Jo=[IDBCursor.prototype.advance,IDBCursor.prototype.continue,IDBCursor.prototype.continuePrimaryKey])}const cl=new WeakMap,ks=new WeakMap,ul=new WeakMap,gs=new WeakMap,ni=new WeakMap;function Kh(n){const e=new Promise((t,r)=>{const s=()=>{n.removeEventListener("success",o),n.removeEventListener("error",a)},o=()=>{t(tt(n.result)),s()},a=()=>{r(n.error),s()};n.addEventListener("success",o),n.addEventListener("error",a)});return e.then(t=>{t instanceof IDBCursor&&cl.set(t,n)}).catch(()=>{}),ni.set(e,n),e}function Hh(n){if(ks.has(n))return;const e=new Promise((t,r)=>{const s=()=>{n.removeEventListener("complete",o),n.removeEventListener("error",a),n.removeEventListener("abort",a)},o=()=>{t(),s()},a=()=>{r(n.error||new DOMException("AbortError","AbortError")),s()};n.addEventListener("complete",o),n.addEventListener("error",a),n.addEventListener("abort",a)});ks.set(n,e)}let Vs={get(n,e,t){if(n instanceof IDBTransaction){if(e==="done")return ks.get(n);if(e==="objectStoreNames")return n.objectStoreNames||ul.get(n);if(e==="store")return t.objectStoreNames[1]?void 0:t.objectStore(t.objectStoreNames[0])}return tt(n[e])},set(n,e,t){return n[e]=t,!0},has(n,e){return n instanceof IDBTransaction&&(e==="done"||e==="store")?!0:e in n}};function Wh(n){Vs=n(Vs)}function Qh(n){return n===IDBDatabase.prototype.transaction&&!("objectStoreNames"in IDBTransaction.prototype)?function(e,...t){const r=n.call(ps(this),e,...t);return ul.set(r,e.sort?e.sort():[e]),tt(r)}:Gh().includes(n)?function(...e){return n.apply(ps(this),e),tt(cl.get(this))}:function(...e){return tt(n.apply(ps(this),e))}}function Yh(n){return typeof n=="function"?Qh(n):(n instanceof IDBTransaction&&Hh(n),qh(n,$h())?new Proxy(n,Vs):n)}function tt(n){if(n instanceof IDBRequest)return Kh(n);if(gs.has(n))return gs.get(n);const e=Yh(n);return e!==n&&(gs.set(n,e),ni.set(e,n)),e}const ps=n=>ni.get(n);function hl(n,e,{blocked:t,upgrade:r,blocking:s,terminated:o}={}){const a=indexedDB.open(n,e),c=tt(a);return r&&a.addEventListener("upgradeneeded",h=>{r(tt(a.result),h.oldVersion,h.newVersion,tt(a.transaction),h)}),t&&a.addEventListener("blocked",h=>t(h.oldVersion,h.newVersion,h)),c.then(h=>{o&&h.addEventListener("close",()=>o()),s&&h.addEventListener("versionchange",d=>s(d.oldVersion,d.newVersion,d))}).catch(()=>{}),c}const Xh=["get","getKey","getAll","getAllKeys","count"],Jh=["put","add","delete","clear"],ys=new Map;function Zo(n,e){if(!(n instanceof IDBDatabase&&!(e in n)&&typeof e=="string"))return;if(ys.get(e))return ys.get(e);const t=e.replace(/FromIndex$/,""),r=e!==t,s=Jh.includes(t);if(!(t in(r?IDBIndex:IDBObjectStore).prototype)||!(s||Xh.includes(t)))return;const o=async function(a,...c){const h=this.transaction(a,s?"readwrite":"readonly");let d=h.store;return r&&(d=d.index(c.shift())),(await Promise.all([d[t](...c),s&&h.done]))[0]};return ys.set(e,o),o}Wh(n=>({...n,get:(e,t,r)=>Zo(e,t)||n.get(e,t,r),has:(e,t)=>!!Zo(e,t)||n.has(e,t)}));/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zh{constructor(e){this.container=e}getPlatformInfoString(){return this.container.getProviders().map(t=>{if(ed(t)){const r=t.getImmediate();return`${r.library}/${r.version}`}else return null}).filter(t=>t).join(" ")}}function ed(n){const e=n.getComponent();return(e==null?void 0:e.type)==="VERSION"}const Bs="@firebase/app",ea="0.10.13";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ke=new ti("@firebase/app"),td="@firebase/app-compat",nd="@firebase/analytics-compat",rd="@firebase/analytics",sd="@firebase/app-check-compat",id="@firebase/app-check",od="@firebase/auth",ad="@firebase/auth-compat",ld="@firebase/database",cd="@firebase/data-connect",ud="@firebase/database-compat",hd="@firebase/functions",dd="@firebase/functions-compat",_d="@firebase/installations",fd="@firebase/installations-compat",md="@firebase/messaging",gd="@firebase/messaging-compat",pd="@firebase/performance",yd="@firebase/performance-compat",vd="@firebase/remote-config",Ed="@firebase/remote-config-compat",Td="@firebase/storage",Rd="@firebase/storage-compat",wd="@firebase/firestore",Ad="@firebase/vertexai-preview",Id="@firebase/firestore-compat",bd="firebase",Sd="10.14.1";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ns="[DEFAULT]",Cd={[Bs]:"fire-core",[td]:"fire-core-compat",[rd]:"fire-analytics",[nd]:"fire-analytics-compat",[id]:"fire-app-check",[sd]:"fire-app-check-compat",[od]:"fire-auth",[ad]:"fire-auth-compat",[ld]:"fire-rtdb",[cd]:"fire-data-connect",[ud]:"fire-rtdb-compat",[hd]:"fire-fn",[dd]:"fire-fn-compat",[_d]:"fire-iid",[fd]:"fire-iid-compat",[md]:"fire-fcm",[gd]:"fire-fcm-compat",[pd]:"fire-perf",[yd]:"fire-perf-compat",[vd]:"fire-rc",[Ed]:"fire-rc-compat",[Td]:"fire-gcs",[Rd]:"fire-gcs-compat",[wd]:"fire-fst",[Id]:"fire-fst-compat",[Ad]:"fire-vertex","fire-js":"fire-js",[bd]:"fire-js-all"};/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const vn=new Map,Pd=new Map,Os=new Map;function ta(n,e){try{n.container.addComponent(e)}catch(t){Ke.debug(`Component ${e.name} failed to register with FirebaseApp ${n.name}`,t)}}function st(n){const e=n.name;if(Os.has(e))return Ke.debug(`There were multiple attempts to register component ${e}.`),!1;Os.set(e,n);for(const t of vn.values())ta(t,n);for(const t of Pd.values())ta(t,n);return!0}function ri(n,e){const t=n.container.getProvider("heartbeat").getImmediate({optional:!0});return t&&t.triggerHeartbeat(),n.container.getProvider(e)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Dd={"no-app":"No Firebase App '{$appName}' has been created - call initializeApp() first","bad-app-name":"Illegal App name: '{$appName}'","duplicate-app":"Firebase App named '{$appName}' already exists with different options or config","app-deleted":"Firebase App named '{$appName}' already deleted","server-app-deleted":"Firebase Server App has been deleted","no-options":"Need to provide options, when not being deployed to hosting via source.","invalid-app-argument":"firebase.{$appName}() takes either no argument or a Firebase App instance.","invalid-log-argument":"First argument to `onLog` must be null or a function.","idb-open":"Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.","idb-get":"Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.","idb-set":"Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.","idb-delete":"Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.","finalization-registry-not-supported":"FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.","invalid-server-app-environment":"FirebaseServerApp is not for use in browser environments."},nt=new Ar("app","Firebase",Dd);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kd{constructor(e,t,r){this._isDeleted=!1,this._options=Object.assign({},e),this._config=Object.assign({},t),this._name=t.name,this._automaticDataCollectionEnabled=t.automaticDataCollectionEnabled,this._container=r,this.container.addComponent(new Ge("app",()=>this,"PUBLIC"))}get automaticDataCollectionEnabled(){return this.checkDestroyed(),this._automaticDataCollectionEnabled}set automaticDataCollectionEnabled(e){this.checkDestroyed(),this._automaticDataCollectionEnabled=e}get name(){return this.checkDestroyed(),this._name}get options(){return this.checkDestroyed(),this._options}get config(){return this.checkDestroyed(),this._config}get container(){return this._container}get isDeleted(){return this._isDeleted}set isDeleted(e){this._isDeleted=e}checkDestroyed(){if(this.isDeleted)throw nt.create("app-deleted",{appName:this._name})}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vd=Sd;function dl(n,e={}){let t=n;typeof e!="object"&&(e={name:e});const r=Object.assign({name:Ns,automaticDataCollectionEnabled:!1},e),s=r.name;if(typeof s!="string"||!s)throw nt.create("bad-app-name",{appName:String(s)});if(t||(t=ol()),!t)throw nt.create("no-options");const o=vn.get(s);if(o){if(Ds(t,o.options)&&Ds(r,o.config))return o;throw nt.create("duplicate-app",{appName:s})}const a=new Fh(s);for(const h of Os.values())a.addComponent(h);const c=new kd(t,r,a);return vn.set(s,c),c}function Bd(n=Ns){const e=vn.get(n);if(!e&&n===Ns&&ol())return dl();if(!e)throw nt.create("no-app",{appName:n});return e}function Nd(){return Array.from(vn.values())}function Ve(n,e,t){var r;let s=(r=Cd[n])!==null&&r!==void 0?r:n;t&&(s+=`-${t}`);const o=s.match(/\s|\//),a=e.match(/\s|\//);if(o||a){const c=[`Unable to register library "${s}" with version "${e}":`];o&&c.push(`library name "${s}" contains illegal characters (whitespace or "/")`),o&&a&&c.push("and"),a&&c.push(`version name "${e}" contains illegal characters (whitespace or "/")`),Ke.warn(c.join(" "));return}st(new Ge(`${s}-version`,()=>({library:s,version:e}),"VERSION"))}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Od="firebase-heartbeat-database",Md=1,En="firebase-heartbeat-store";let vs=null;function _l(){return vs||(vs=hl(Od,Md,{upgrade:(n,e)=>{switch(e){case 0:try{n.createObjectStore(En)}catch(t){console.warn(t)}}}}).catch(n=>{throw nt.create("idb-open",{originalErrorMessage:n.message})})),vs}async function xd(n){try{const t=(await _l()).transaction(En),r=await t.objectStore(En).get(fl(n));return await t.done,r}catch(e){if(e instanceof lt)Ke.warn(e.message);else{const t=nt.create("idb-get",{originalErrorMessage:e==null?void 0:e.message});Ke.warn(t.message)}}}async function na(n,e){try{const r=(await _l()).transaction(En,"readwrite");await r.objectStore(En).put(e,fl(n)),await r.done}catch(t){if(t instanceof lt)Ke.warn(t.message);else{const r=nt.create("idb-set",{originalErrorMessage:t==null?void 0:t.message});Ke.warn(r.message)}}}function fl(n){return`${n.name}!${n.options.appId}`}/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Fd=1024,Ld=720*60*60*1e3;class Ud{constructor(e){this.container=e,this._heartbeatsCache=null;const t=this.container.getProvider("app").getImmediate();this._storage=new jd(t),this._heartbeatsCachePromise=this._storage.read().then(r=>(this._heartbeatsCache=r,r))}async triggerHeartbeat(){var e,t;try{const s=this.container.getProvider("platform-logger").getImmediate().getPlatformInfoString(),o=ra();return((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null&&(this._heartbeatsCache=await this._heartbeatsCachePromise,((t=this._heartbeatsCache)===null||t===void 0?void 0:t.heartbeats)==null)||this._heartbeatsCache.lastSentHeartbeatDate===o||this._heartbeatsCache.heartbeats.some(a=>a.date===o)?void 0:(this._heartbeatsCache.heartbeats.push({date:o,agent:s}),this._heartbeatsCache.heartbeats=this._heartbeatsCache.heartbeats.filter(a=>{const c=new Date(a.date).valueOf();return Date.now()-c<=Ld}),this._storage.overwrite(this._heartbeatsCache))}catch(r){Ke.warn(r)}}async getHeartbeatsHeader(){var e;try{if(this._heartbeatsCache===null&&await this._heartbeatsCachePromise,((e=this._heartbeatsCache)===null||e===void 0?void 0:e.heartbeats)==null||this._heartbeatsCache.heartbeats.length===0)return"";const t=ra(),{heartbeatsToSend:r,unsentEntries:s}=zd(this._heartbeatsCache.heartbeats),o=_r(JSON.stringify({version:2,heartbeats:r}));return this._heartbeatsCache.lastSentHeartbeatDate=t,s.length>0?(this._heartbeatsCache.heartbeats=s,await this._storage.overwrite(this._heartbeatsCache)):(this._heartbeatsCache.heartbeats=[],this._storage.overwrite(this._heartbeatsCache)),o}catch(t){return Ke.warn(t),""}}}function ra(){return new Date().toISOString().substring(0,10)}function zd(n,e=Fd){const t=[];let r=n.slice();for(const s of n){const o=t.find(a=>a.agent===s.agent);if(o){if(o.dates.push(s.date),sa(t)>e){o.dates.pop();break}}else if(t.push({agent:s.agent,dates:[s.date]}),sa(t)>e){t.pop();break}r=r.slice(1)}return{heartbeatsToSend:t,unsentEntries:r}}class jd{constructor(e){this.app=e,this._canUseIndexedDBPromise=this.runIndexedDBEnvironmentCheck()}async runIndexedDBEnvironmentCheck(){return al()?ll().then(()=>!0).catch(()=>!1):!1}async read(){if(await this._canUseIndexedDBPromise){const t=await xd(this.app);return t!=null&&t.heartbeats?t:{heartbeats:[]}}else return{heartbeats:[]}}async overwrite(e){var t;if(await this._canUseIndexedDBPromise){const s=await this.read();return na(this.app,{lastSentHeartbeatDate:(t=e.lastSentHeartbeatDate)!==null&&t!==void 0?t:s.lastSentHeartbeatDate,heartbeats:e.heartbeats})}else return}async add(e){var t;if(await this._canUseIndexedDBPromise){const s=await this.read();return na(this.app,{lastSentHeartbeatDate:(t=e.lastSentHeartbeatDate)!==null&&t!==void 0?t:s.lastSentHeartbeatDate,heartbeats:[...s.heartbeats,...e.heartbeats]})}else return}}function sa(n){return _r(JSON.stringify({version:2,heartbeats:n})).length}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function qd(n){st(new Ge("platform-logger",e=>new Zh(e),"PRIVATE")),st(new Ge("heartbeat",e=>new Ud(e),"PRIVATE")),Ve(Bs,ea,n),Ve(Bs,ea,"esm2017"),Ve("fire-js","")}qd("");var $d="firebase",Gd="10.14.1";/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Ve($d,Gd,"app");const ml="@firebase/installations",si="0.6.9";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const gl=1e4,pl=`w:${si}`,yl="FIS_v2",Kd="https://firebaseinstallations.googleapis.com/v1",Hd=3600*1e3,Wd="installations",Qd="Installations";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Yd={"missing-app-config-values":'Missing App configuration value: "{$valueName}"',"not-registered":"Firebase Installation is not registered.","installation-not-found":"Firebase Installation not found.","request-failed":'{$requestName} request failed with error "{$serverCode} {$serverStatus}: {$serverMessage}"',"app-offline":"Could not process request. Application offline.","delete-pending-registration":"Can't delete installation while there is a pending registration request."},yt=new Ar(Wd,Qd,Yd);function vl(n){return n instanceof lt&&n.code.includes("request-failed")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function El({projectId:n}){return`${Kd}/projects/${n}/installations`}function Tl(n){return{token:n.token,requestStatus:2,expiresIn:Jd(n.expiresIn),creationTime:Date.now()}}async function Rl(n,e){const r=(await e.json()).error;return yt.create("request-failed",{requestName:n,serverCode:r.code,serverMessage:r.message,serverStatus:r.status})}function wl({apiKey:n}){return new Headers({"Content-Type":"application/json",Accept:"application/json","x-goog-api-key":n})}function Xd(n,{refreshToken:e}){const t=wl(n);return t.append("Authorization",Zd(e)),t}async function Al(n){const e=await n();return e.status>=500&&e.status<600?n():e}function Jd(n){return Number(n.replace("s","000"))}function Zd(n){return`${yl} ${n}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function e_({appConfig:n,heartbeatServiceProvider:e},{fid:t}){const r=El(n),s=wl(n),o=e.getImmediate({optional:!0});if(o){const d=await o.getHeartbeatsHeader();d&&s.append("x-firebase-client",d)}const a={fid:t,authVersion:yl,appId:n.appId,sdkVersion:pl},c={method:"POST",headers:s,body:JSON.stringify(a)},h=await Al(()=>fetch(r,c));if(h.ok){const d=await h.json();return{fid:d.fid||t,registrationStatus:2,refreshToken:d.refreshToken,authToken:Tl(d.authToken)}}else throw await Rl("Create Installation",h)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Il(n){return new Promise(e=>{setTimeout(e,n)})}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function t_(n){return btoa(String.fromCharCode(...n)).replace(/\+/g,"-").replace(/\//g,"_")}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const n_=/^[cdef][\w-]{21}$/,Ms="";function r_(){try{const n=new Uint8Array(17);(self.crypto||self.msCrypto).getRandomValues(n),n[0]=112+n[0]%16;const t=s_(n);return n_.test(t)?t:Ms}catch{return Ms}}function s_(n){return t_(n).substr(0,22)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ir(n){return`${n.appName}!${n.appId}`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const bl=new Map;function Sl(n,e){const t=Ir(n);Cl(t,e),i_(t,e)}function Cl(n,e){const t=bl.get(n);if(t)for(const r of t)r(e)}function i_(n,e){const t=o_();t&&t.postMessage({key:n,fid:e}),a_()}let mt=null;function o_(){return!mt&&"BroadcastChannel"in self&&(mt=new BroadcastChannel("[Firebase] FID Change"),mt.onmessage=n=>{Cl(n.data.key,n.data.fid)}),mt}function a_(){bl.size===0&&mt&&(mt.close(),mt=null)}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const l_="firebase-installations-database",c_=1,vt="firebase-installations-store";let Es=null;function ii(){return Es||(Es=hl(l_,c_,{upgrade:(n,e)=>{switch(e){case 0:n.createObjectStore(vt)}}})),Es}async function fr(n,e){const t=Ir(n),s=(await ii()).transaction(vt,"readwrite"),o=s.objectStore(vt),a=await o.get(t);return await o.put(e,t),await s.done,(!a||a.fid!==e.fid)&&Sl(n,e.fid),e}async function Pl(n){const e=Ir(n),r=(await ii()).transaction(vt,"readwrite");await r.objectStore(vt).delete(e),await r.done}async function br(n,e){const t=Ir(n),s=(await ii()).transaction(vt,"readwrite"),o=s.objectStore(vt),a=await o.get(t),c=e(a);return c===void 0?await o.delete(t):await o.put(c,t),await s.done,c&&(!a||a.fid!==c.fid)&&Sl(n,c.fid),c}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function oi(n){let e;const t=await br(n.appConfig,r=>{const s=u_(r),o=h_(n,s);return e=o.registrationPromise,o.installationEntry});return t.fid===Ms?{installationEntry:await e}:{installationEntry:t,registrationPromise:e}}function u_(n){const e=n||{fid:r_(),registrationStatus:0};return Dl(e)}function h_(n,e){if(e.registrationStatus===0){if(!navigator.onLine){const s=Promise.reject(yt.create("app-offline"));return{installationEntry:e,registrationPromise:s}}const t={fid:e.fid,registrationStatus:1,registrationTime:Date.now()},r=d_(n,t);return{installationEntry:t,registrationPromise:r}}else return e.registrationStatus===1?{installationEntry:e,registrationPromise:__(n)}:{installationEntry:e}}async function d_(n,e){try{const t=await e_(n,e);return fr(n.appConfig,t)}catch(t){throw vl(t)&&t.customData.serverCode===409?await Pl(n.appConfig):await fr(n.appConfig,{fid:e.fid,registrationStatus:0}),t}}async function __(n){let e=await ia(n.appConfig);for(;e.registrationStatus===1;)await Il(100),e=await ia(n.appConfig);if(e.registrationStatus===0){const{installationEntry:t,registrationPromise:r}=await oi(n);return r||t}return e}function ia(n){return br(n,e=>{if(!e)throw yt.create("installation-not-found");return Dl(e)})}function Dl(n){return f_(n)?{fid:n.fid,registrationStatus:0}:n}function f_(n){return n.registrationStatus===1&&n.registrationTime+gl<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function m_({appConfig:n,heartbeatServiceProvider:e},t){const r=g_(n,t),s=Xd(n,t),o=e.getImmediate({optional:!0});if(o){const d=await o.getHeartbeatsHeader();d&&s.append("x-firebase-client",d)}const a={installation:{sdkVersion:pl,appId:n.appId}},c={method:"POST",headers:s,body:JSON.stringify(a)},h=await Al(()=>fetch(r,c));if(h.ok){const d=await h.json();return Tl(d)}else throw await Rl("Generate Auth Token",h)}function g_(n,{fid:e}){return`${El(n)}/${e}/authTokens:generate`}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ai(n,e=!1){let t;const r=await br(n.appConfig,o=>{if(!kl(o))throw yt.create("not-registered");const a=o.authToken;if(!e&&v_(a))return o;if(a.requestStatus===1)return t=p_(n,e),o;{if(!navigator.onLine)throw yt.create("app-offline");const c=T_(o);return t=y_(n,c),c}});return t?await t:r.authToken}async function p_(n,e){let t=await oa(n.appConfig);for(;t.authToken.requestStatus===1;)await Il(100),t=await oa(n.appConfig);const r=t.authToken;return r.requestStatus===0?ai(n,e):r}function oa(n){return br(n,e=>{if(!kl(e))throw yt.create("not-registered");const t=e.authToken;return R_(t)?Object.assign(Object.assign({},e),{authToken:{requestStatus:0}}):e})}async function y_(n,e){try{const t=await m_(n,e),r=Object.assign(Object.assign({},e),{authToken:t});return await fr(n.appConfig,r),t}catch(t){if(vl(t)&&(t.customData.serverCode===401||t.customData.serverCode===404))await Pl(n.appConfig);else{const r=Object.assign(Object.assign({},e),{authToken:{requestStatus:0}});await fr(n.appConfig,r)}throw t}}function kl(n){return n!==void 0&&n.registrationStatus===2}function v_(n){return n.requestStatus===2&&!E_(n)}function E_(n){const e=Date.now();return e<n.creationTime||n.creationTime+n.expiresIn<e+Hd}function T_(n){const e={requestStatus:1,requestTime:Date.now()};return Object.assign(Object.assign({},n),{authToken:e})}function R_(n){return n.requestStatus===1&&n.requestTime+gl<Date.now()}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function w_(n){const e=n,{installationEntry:t,registrationPromise:r}=await oi(e);return r?r.catch(console.error):ai(e).catch(console.error),t.fid}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function A_(n,e=!1){const t=n;return await I_(t),(await ai(t,e)).token}async function I_(n){const{registrationPromise:e}=await oi(n);e&&await e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function b_(n){if(!n||!n.options)throw Ts("App Configuration");if(!n.name)throw Ts("App Name");const e=["projectId","apiKey","appId"];for(const t of e)if(!n.options[t])throw Ts(t);return{appName:n.name,projectId:n.options.projectId,apiKey:n.options.apiKey,appId:n.options.appId}}function Ts(n){return yt.create("missing-app-config-values",{valueName:n})}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Vl="installations",S_="installations-internal",C_=n=>{const e=n.getProvider("app").getImmediate(),t=b_(e),r=ri(e,"heartbeat");return{app:e,appConfig:t,heartbeatServiceProvider:r,_delete:()=>Promise.resolve()}},P_=n=>{const e=n.getProvider("app").getImmediate(),t=ri(e,Vl).getImmediate();return{getId:()=>w_(t),getToken:s=>A_(t,s)}};function D_(){st(new Ge(Vl,C_,"PUBLIC")),st(new Ge(S_,P_,"PRIVATE"))}D_();Ve(ml,si);Ve(ml,si,"esm2017");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const aa="analytics",k_="firebase_id",V_="origin",B_=60*1e3,N_="https://firebase.googleapis.com/v1alpha/projects/-/apps/{app-id}/webConfig",li="https://www.googletagmanager.com/gtag/js";/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Re=new ti("@firebase/analytics");/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const O_={"already-exists":"A Firebase Analytics instance with the appId {$id}  already exists. Only one Firebase Analytics instance can be created for each appId.","already-initialized":"initializeAnalytics() cannot be called again with different options than those it was initially called with. It can be called again with the same options to return the existing instance, or getAnalytics() can be used to get a reference to the already-initialized instance.","already-initialized-settings":"Firebase Analytics has already been initialized.settings() must be called before initializing any Analytics instanceor it will have no effect.","interop-component-reg-failed":"Firebase Analytics Interop Component failed to instantiate: {$reason}","invalid-analytics-context":"Firebase Analytics is not supported in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","indexeddb-unavailable":"IndexedDB unavailable or restricted in this environment. Wrap initialization of analytics in analytics.isSupported() to prevent initialization in unsupported environments. Details: {$errorInfo}","fetch-throttle":"The config fetch request timed out while in an exponential backoff state. Unix timestamp in milliseconds when fetch request throttling ends: {$throttleEndTimeMillis}.","config-fetch-failed":"Dynamic config fetch failed: [{$httpStatus}] {$responseMessage}","no-api-key":'The "apiKey" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid API key.',"no-app-id":'The "appId" field is empty in the local Firebase config. Firebase Analytics requires this field tocontain a valid app ID.',"no-client-id":'The "client_id" field is empty.',"invalid-gtag-resource":"Trusted Types detected an invalid gtag resource: {$gtagURL}."},Ce=new Ar("analytics","Analytics",O_);/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function M_(n){if(!n.startsWith(li)){const e=Ce.create("invalid-gtag-resource",{gtagURL:n});return Re.warn(e.message),""}return n}function Bl(n){return Promise.all(n.map(e=>e.catch(t=>t)))}function x_(n,e){let t;return window.trustedTypes&&(t=window.trustedTypes.createPolicy(n,e)),t}function F_(n,e){const t=x_("firebase-js-sdk-policy",{createScriptURL:M_}),r=document.createElement("script"),s=`${li}?l=${n}&id=${e}`;r.src=t?t==null?void 0:t.createScriptURL(s):s,r.async=!0,document.head.appendChild(r)}function L_(n){let e=[];return Array.isArray(window[n])?e=window[n]:window[n]=e,e}async function U_(n,e,t,r,s,o){const a=r[s];try{if(a)await e[a];else{const h=(await Bl(t)).find(d=>d.measurementId===s);h&&await e[h.appId]}}catch(c){Re.error(c)}n("config",s,o)}async function z_(n,e,t,r,s){try{let o=[];if(s&&s.send_to){let a=s.send_to;Array.isArray(a)||(a=[a]);const c=await Bl(t);for(const h of a){const d=c.find(w=>w.measurementId===h),m=d&&e[d.appId];if(m)o.push(m);else{o=[];break}}}o.length===0&&(o=Object.values(e)),await Promise.all(o),n("event",r,s||{})}catch(o){Re.error(o)}}function j_(n,e,t,r){async function s(o,...a){try{if(o==="event"){const[c,h]=a;await z_(n,e,t,c,h)}else if(o==="config"){const[c,h]=a;await U_(n,e,t,r,c,h)}else if(o==="consent"){const[c,h]=a;n("consent",c,h)}else if(o==="get"){const[c,h,d]=a;n("get",c,h,d)}else if(o==="set"){const[c]=a;n("set",c)}else n(o,...a)}catch(c){Re.error(c)}}return s}function q_(n,e,t,r,s){let o=function(...a){window[r].push(arguments)};return window[s]&&typeof window[s]=="function"&&(o=window[s]),window[s]=j_(o,n,e,t),{gtagCore:o,wrappedGtag:window[s]}}function $_(n){const e=window.document.getElementsByTagName("script");for(const t of Object.values(e))if(t.src&&t.src.includes(li)&&t.src.includes(n))return t;return null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const G_=30,K_=1e3;class H_{constructor(e={},t=K_){this.throttleMetadata=e,this.intervalMillis=t}getThrottleMetadata(e){return this.throttleMetadata[e]}setThrottleMetadata(e,t){this.throttleMetadata[e]=t}deleteThrottleMetadata(e){delete this.throttleMetadata[e]}}const Nl=new H_;function W_(n){return new Headers({Accept:"application/json","x-goog-api-key":n})}async function Q_(n){var e;const{appId:t,apiKey:r}=n,s={method:"GET",headers:W_(r)},o=N_.replace("{app-id}",t),a=await fetch(o,s);if(a.status!==200&&a.status!==304){let c="";try{const h=await a.json();!((e=h.error)===null||e===void 0)&&e.message&&(c=h.error.message)}catch{}throw Ce.create("config-fetch-failed",{httpStatus:a.status,responseMessage:c})}return a.json()}async function Y_(n,e=Nl,t){const{appId:r,apiKey:s,measurementId:o}=n.options;if(!r)throw Ce.create("no-app-id");if(!s){if(o)return{measurementId:o,appId:r};throw Ce.create("no-api-key")}const a=e.getThrottleMetadata(r)||{backoffCount:0,throttleEndTimeMillis:Date.now()},c=new Z_;return setTimeout(async()=>{c.abort()},B_),Ol({appId:r,apiKey:s,measurementId:o},a,c,e)}async function Ol(n,{throttleEndTimeMillis:e,backoffCount:t},r,s=Nl){var o;const{appId:a,measurementId:c}=n;try{await X_(r,e)}catch(h){if(c)return Re.warn(`Timed out fetching this Firebase app's measurement ID from the server. Falling back to the measurement ID ${c} provided in the "measurementId" field in the local Firebase config. [${h==null?void 0:h.message}]`),{appId:a,measurementId:c};throw h}try{const h=await Q_(n);return s.deleteThrottleMetadata(a),h}catch(h){const d=h;if(!J_(d)){if(s.deleteThrottleMetadata(a),c)return Re.warn(`Failed to fetch this Firebase app's measurement ID from the server. Falling back to the measurement ID ${c} provided in the "measurementId" field in the local Firebase config. [${d==null?void 0:d.message}]`),{appId:a,measurementId:c};throw h}const m=Number((o=d==null?void 0:d.customData)===null||o===void 0?void 0:o.httpStatus)===503?Yo(t,s.intervalMillis,G_):Yo(t,s.intervalMillis),w={throttleEndTimeMillis:Date.now()+m,backoffCount:t+1};return s.setThrottleMetadata(a,w),Re.debug(`Calling attemptFetch again in ${m} millis`),Ol(n,w,r,s)}}function X_(n,e){return new Promise((t,r)=>{const s=Math.max(e-Date.now(),0),o=setTimeout(t,s);n.addEventListener(()=>{clearTimeout(o),r(Ce.create("fetch-throttle",{throttleEndTimeMillis:e}))})})}function J_(n){if(!(n instanceof lt)||!n.customData)return!1;const e=Number(n.customData.httpStatus);return e===429||e===500||e===503||e===504}class Z_{constructor(){this.listeners=[]}addEventListener(e){this.listeners.push(e)}abort(){this.listeners.forEach(e=>e())}}async function ef(n,e,t,r,s){if(s&&s.global){n("event",t,r);return}else{const o=await e,a=Object.assign(Object.assign({},r),{send_to:o});n("event",t,a)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function tf(){if(al())try{await ll()}catch(n){return Re.warn(Ce.create("indexeddb-unavailable",{errorInfo:n==null?void 0:n.toString()}).message),!1}else return Re.warn(Ce.create("indexeddb-unavailable",{errorInfo:"IndexedDB is not available in this environment."}).message),!1;return!0}async function nf(n,e,t,r,s,o,a){var c;const h=Y_(n);h.then(b=>{t[b.measurementId]=b.appId,n.options.measurementId&&b.measurementId!==n.options.measurementId&&Re.warn(`The measurement ID in the local Firebase config (${n.options.measurementId}) does not match the measurement ID fetched from the server (${b.measurementId}). To ensure analytics events are always sent to the correct Analytics property, update the measurement ID field in the local config or remove it from the local config.`)}).catch(b=>Re.error(b)),e.push(h);const d=tf().then(b=>{if(b)return r.getId()}),[m,w]=await Promise.all([h,d]);$_(o)||F_(o,m.measurementId),s("js",new Date);const A=(c=a==null?void 0:a.config)!==null&&c!==void 0?c:{};return A[V_]="firebase",A.update=!0,w!=null&&(A[k_]=w),s("config",m.measurementId,A),m.measurementId}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rf{constructor(e){this.app=e}_delete(){return delete fn[this.app.options.appId],Promise.resolve()}}let fn={},la=[];const ca={};let Rs="dataLayer",sf="gtag",ua,Ml,ha=!1;function of(){const n=[];if(Ih()&&n.push("This is a browser extension environment."),Sh()||n.push("Cookies are not available."),n.length>0){const e=n.map((r,s)=>`(${s+1}) ${r}`).join(" "),t=Ce.create("invalid-analytics-context",{errorInfo:e});Re.warn(t.message)}}function af(n,e,t){of();const r=n.options.appId;if(!r)throw Ce.create("no-app-id");if(!n.options.apiKey)if(n.options.measurementId)Re.warn(`The "apiKey" field is empty in the local Firebase config. This is needed to fetch the latest measurement ID for this Firebase app. Falling back to the measurement ID ${n.options.measurementId} provided in the "measurementId" field in the local Firebase config.`);else throw Ce.create("no-api-key");if(fn[r]!=null)throw Ce.create("already-exists",{id:r});if(!ha){L_(Rs);const{wrappedGtag:o,gtagCore:a}=q_(fn,la,ca,Rs,sf);Ml=o,ua=a,ha=!0}return fn[r]=nf(n,la,ca,e,ua,Rs,t),new rf(n)}function lf(n,e,t,r){n=$e(n),ef(Ml,fn[n.app.options.appId],e,t,r).catch(s=>Re.error(s))}const da="@firebase/analytics",_a="0.10.8";function cf(){st(new Ge(aa,(e,{options:t})=>{const r=e.getProvider("app").getImmediate(),s=e.getProvider("installations-internal").getImmediate();return af(r,s,t)},"PUBLIC")),st(new Ge("analytics-internal",n,"PRIVATE")),Ve(da,_a),Ve(da,_a,"esm2017");function n(e){try{const t=e.getProvider(aa).getImmediate();return{logEvent:(r,s,o)=>lf(t,r,s,o)}}catch(t){throw Ce.create("interop-component-reg-failed",{reason:t})}}}cf();var fa=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var pt,xl;(function(){var n;/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/function e(E,f){function p(){}p.prototype=f.prototype,E.D=f.prototype,E.prototype=new p,E.prototype.constructor=E,E.C=function(y,v,R){for(var g=Array(arguments.length-2),Ue=2;Ue<arguments.length;Ue++)g[Ue-2]=arguments[Ue];return f.prototype[v].apply(y,g)}}function t(){this.blockSize=-1}function r(){this.blockSize=-1,this.blockSize=64,this.g=Array(4),this.B=Array(this.blockSize),this.o=this.h=0,this.s()}e(r,t),r.prototype.s=function(){this.g[0]=1732584193,this.g[1]=4023233417,this.g[2]=2562383102,this.g[3]=271733878,this.o=this.h=0};function s(E,f,p){p||(p=0);var y=Array(16);if(typeof f=="string")for(var v=0;16>v;++v)y[v]=f.charCodeAt(p++)|f.charCodeAt(p++)<<8|f.charCodeAt(p++)<<16|f.charCodeAt(p++)<<24;else for(v=0;16>v;++v)y[v]=f[p++]|f[p++]<<8|f[p++]<<16|f[p++]<<24;f=E.g[0],p=E.g[1],v=E.g[2];var R=E.g[3],g=f+(R^p&(v^R))+y[0]+3614090360&4294967295;f=p+(g<<7&4294967295|g>>>25),g=R+(v^f&(p^v))+y[1]+3905402710&4294967295,R=f+(g<<12&4294967295|g>>>20),g=v+(p^R&(f^p))+y[2]+606105819&4294967295,v=R+(g<<17&4294967295|g>>>15),g=p+(f^v&(R^f))+y[3]+3250441966&4294967295,p=v+(g<<22&4294967295|g>>>10),g=f+(R^p&(v^R))+y[4]+4118548399&4294967295,f=p+(g<<7&4294967295|g>>>25),g=R+(v^f&(p^v))+y[5]+1200080426&4294967295,R=f+(g<<12&4294967295|g>>>20),g=v+(p^R&(f^p))+y[6]+2821735955&4294967295,v=R+(g<<17&4294967295|g>>>15),g=p+(f^v&(R^f))+y[7]+4249261313&4294967295,p=v+(g<<22&4294967295|g>>>10),g=f+(R^p&(v^R))+y[8]+1770035416&4294967295,f=p+(g<<7&4294967295|g>>>25),g=R+(v^f&(p^v))+y[9]+2336552879&4294967295,R=f+(g<<12&4294967295|g>>>20),g=v+(p^R&(f^p))+y[10]+4294925233&4294967295,v=R+(g<<17&4294967295|g>>>15),g=p+(f^v&(R^f))+y[11]+2304563134&4294967295,p=v+(g<<22&4294967295|g>>>10),g=f+(R^p&(v^R))+y[12]+1804603682&4294967295,f=p+(g<<7&4294967295|g>>>25),g=R+(v^f&(p^v))+y[13]+4254626195&4294967295,R=f+(g<<12&4294967295|g>>>20),g=v+(p^R&(f^p))+y[14]+2792965006&4294967295,v=R+(g<<17&4294967295|g>>>15),g=p+(f^v&(R^f))+y[15]+1236535329&4294967295,p=v+(g<<22&4294967295|g>>>10),g=f+(v^R&(p^v))+y[1]+4129170786&4294967295,f=p+(g<<5&4294967295|g>>>27),g=R+(p^v&(f^p))+y[6]+3225465664&4294967295,R=f+(g<<9&4294967295|g>>>23),g=v+(f^p&(R^f))+y[11]+643717713&4294967295,v=R+(g<<14&4294967295|g>>>18),g=p+(R^f&(v^R))+y[0]+3921069994&4294967295,p=v+(g<<20&4294967295|g>>>12),g=f+(v^R&(p^v))+y[5]+3593408605&4294967295,f=p+(g<<5&4294967295|g>>>27),g=R+(p^v&(f^p))+y[10]+38016083&4294967295,R=f+(g<<9&4294967295|g>>>23),g=v+(f^p&(R^f))+y[15]+3634488961&4294967295,v=R+(g<<14&4294967295|g>>>18),g=p+(R^f&(v^R))+y[4]+3889429448&4294967295,p=v+(g<<20&4294967295|g>>>12),g=f+(v^R&(p^v))+y[9]+568446438&4294967295,f=p+(g<<5&4294967295|g>>>27),g=R+(p^v&(f^p))+y[14]+3275163606&4294967295,R=f+(g<<9&4294967295|g>>>23),g=v+(f^p&(R^f))+y[3]+4107603335&4294967295,v=R+(g<<14&4294967295|g>>>18),g=p+(R^f&(v^R))+y[8]+1163531501&4294967295,p=v+(g<<20&4294967295|g>>>12),g=f+(v^R&(p^v))+y[13]+2850285829&4294967295,f=p+(g<<5&4294967295|g>>>27),g=R+(p^v&(f^p))+y[2]+4243563512&4294967295,R=f+(g<<9&4294967295|g>>>23),g=v+(f^p&(R^f))+y[7]+1735328473&4294967295,v=R+(g<<14&4294967295|g>>>18),g=p+(R^f&(v^R))+y[12]+2368359562&4294967295,p=v+(g<<20&4294967295|g>>>12),g=f+(p^v^R)+y[5]+4294588738&4294967295,f=p+(g<<4&4294967295|g>>>28),g=R+(f^p^v)+y[8]+2272392833&4294967295,R=f+(g<<11&4294967295|g>>>21),g=v+(R^f^p)+y[11]+1839030562&4294967295,v=R+(g<<16&4294967295|g>>>16),g=p+(v^R^f)+y[14]+4259657740&4294967295,p=v+(g<<23&4294967295|g>>>9),g=f+(p^v^R)+y[1]+2763975236&4294967295,f=p+(g<<4&4294967295|g>>>28),g=R+(f^p^v)+y[4]+1272893353&4294967295,R=f+(g<<11&4294967295|g>>>21),g=v+(R^f^p)+y[7]+4139469664&4294967295,v=R+(g<<16&4294967295|g>>>16),g=p+(v^R^f)+y[10]+3200236656&4294967295,p=v+(g<<23&4294967295|g>>>9),g=f+(p^v^R)+y[13]+681279174&4294967295,f=p+(g<<4&4294967295|g>>>28),g=R+(f^p^v)+y[0]+3936430074&4294967295,R=f+(g<<11&4294967295|g>>>21),g=v+(R^f^p)+y[3]+3572445317&4294967295,v=R+(g<<16&4294967295|g>>>16),g=p+(v^R^f)+y[6]+76029189&4294967295,p=v+(g<<23&4294967295|g>>>9),g=f+(p^v^R)+y[9]+3654602809&4294967295,f=p+(g<<4&4294967295|g>>>28),g=R+(f^p^v)+y[12]+3873151461&4294967295,R=f+(g<<11&4294967295|g>>>21),g=v+(R^f^p)+y[15]+530742520&4294967295,v=R+(g<<16&4294967295|g>>>16),g=p+(v^R^f)+y[2]+3299628645&4294967295,p=v+(g<<23&4294967295|g>>>9),g=f+(v^(p|~R))+y[0]+4096336452&4294967295,f=p+(g<<6&4294967295|g>>>26),g=R+(p^(f|~v))+y[7]+1126891415&4294967295,R=f+(g<<10&4294967295|g>>>22),g=v+(f^(R|~p))+y[14]+2878612391&4294967295,v=R+(g<<15&4294967295|g>>>17),g=p+(R^(v|~f))+y[5]+4237533241&4294967295,p=v+(g<<21&4294967295|g>>>11),g=f+(v^(p|~R))+y[12]+1700485571&4294967295,f=p+(g<<6&4294967295|g>>>26),g=R+(p^(f|~v))+y[3]+2399980690&4294967295,R=f+(g<<10&4294967295|g>>>22),g=v+(f^(R|~p))+y[10]+4293915773&4294967295,v=R+(g<<15&4294967295|g>>>17),g=p+(R^(v|~f))+y[1]+2240044497&4294967295,p=v+(g<<21&4294967295|g>>>11),g=f+(v^(p|~R))+y[8]+1873313359&4294967295,f=p+(g<<6&4294967295|g>>>26),g=R+(p^(f|~v))+y[15]+4264355552&4294967295,R=f+(g<<10&4294967295|g>>>22),g=v+(f^(R|~p))+y[6]+2734768916&4294967295,v=R+(g<<15&4294967295|g>>>17),g=p+(R^(v|~f))+y[13]+1309151649&4294967295,p=v+(g<<21&4294967295|g>>>11),g=f+(v^(p|~R))+y[4]+4149444226&4294967295,f=p+(g<<6&4294967295|g>>>26),g=R+(p^(f|~v))+y[11]+3174756917&4294967295,R=f+(g<<10&4294967295|g>>>22),g=v+(f^(R|~p))+y[2]+718787259&4294967295,v=R+(g<<15&4294967295|g>>>17),g=p+(R^(v|~f))+y[9]+3951481745&4294967295,E.g[0]=E.g[0]+f&4294967295,E.g[1]=E.g[1]+(v+(g<<21&4294967295|g>>>11))&4294967295,E.g[2]=E.g[2]+v&4294967295,E.g[3]=E.g[3]+R&4294967295}r.prototype.u=function(E,f){f===void 0&&(f=E.length);for(var p=f-this.blockSize,y=this.B,v=this.h,R=0;R<f;){if(v==0)for(;R<=p;)s(this,E,R),R+=this.blockSize;if(typeof E=="string"){for(;R<f;)if(y[v++]=E.charCodeAt(R++),v==this.blockSize){s(this,y),v=0;break}}else for(;R<f;)if(y[v++]=E[R++],v==this.blockSize){s(this,y),v=0;break}}this.h=v,this.o+=f},r.prototype.v=function(){var E=Array((56>this.h?this.blockSize:2*this.blockSize)-this.h);E[0]=128;for(var f=1;f<E.length-8;++f)E[f]=0;var p=8*this.o;for(f=E.length-8;f<E.length;++f)E[f]=p&255,p/=256;for(this.u(E),E=Array(16),f=p=0;4>f;++f)for(var y=0;32>y;y+=8)E[p++]=this.g[f]>>>y&255;return E};function o(E,f){var p=c;return Object.prototype.hasOwnProperty.call(p,E)?p[E]:p[E]=f(E)}function a(E,f){this.h=f;for(var p=[],y=!0,v=E.length-1;0<=v;v--){var R=E[v]|0;y&&R==f||(p[v]=R,y=!1)}this.g=p}var c={};function h(E){return-128<=E&&128>E?o(E,function(f){return new a([f|0],0>f?-1:0)}):new a([E|0],0>E?-1:0)}function d(E){if(isNaN(E)||!isFinite(E))return w;if(0>E)return D(d(-E));for(var f=[],p=1,y=0;E>=p;y++)f[y]=E/p|0,p*=4294967296;return new a(f,0)}function m(E,f){if(E.length==0)throw Error("number format error: empty string");if(f=f||10,2>f||36<f)throw Error("radix out of range: "+f);if(E.charAt(0)=="-")return D(m(E.substring(1),f));if(0<=E.indexOf("-"))throw Error('number format error: interior "-" character');for(var p=d(Math.pow(f,8)),y=w,v=0;v<E.length;v+=8){var R=Math.min(8,E.length-v),g=parseInt(E.substring(v,v+R),f);8>R?(R=d(Math.pow(f,R)),y=y.j(R).add(d(g))):(y=y.j(p),y=y.add(d(g)))}return y}var w=h(0),A=h(1),b=h(16777216);n=a.prototype,n.m=function(){if(N(this))return-D(this).m();for(var E=0,f=1,p=0;p<this.g.length;p++){var y=this.i(p);E+=(0<=y?y:4294967296+y)*f,f*=4294967296}return E},n.toString=function(E){if(E=E||10,2>E||36<E)throw Error("radix out of range: "+E);if(k(this))return"0";if(N(this))return"-"+D(this).toString(E);for(var f=d(Math.pow(E,6)),p=this,y="";;){var v=re(p,f).g;p=K(p,v.j(f));var R=((0<p.g.length?p.g[0]:p.h)>>>0).toString(E);if(p=v,k(p))return R+y;for(;6>R.length;)R="0"+R;y=R+y}},n.i=function(E){return 0>E?0:E<this.g.length?this.g[E]:this.h};function k(E){if(E.h!=0)return!1;for(var f=0;f<E.g.length;f++)if(E.g[f]!=0)return!1;return!0}function N(E){return E.h==-1}n.l=function(E){return E=K(this,E),N(E)?-1:k(E)?0:1};function D(E){for(var f=E.g.length,p=[],y=0;y<f;y++)p[y]=~E.g[y];return new a(p,~E.h).add(A)}n.abs=function(){return N(this)?D(this):this},n.add=function(E){for(var f=Math.max(this.g.length,E.g.length),p=[],y=0,v=0;v<=f;v++){var R=y+(this.i(v)&65535)+(E.i(v)&65535),g=(R>>>16)+(this.i(v)>>>16)+(E.i(v)>>>16);y=g>>>16,R&=65535,g&=65535,p[v]=g<<16|R}return new a(p,p[p.length-1]&-2147483648?-1:0)};function K(E,f){return E.add(D(f))}n.j=function(E){if(k(this)||k(E))return w;if(N(this))return N(E)?D(this).j(D(E)):D(D(this).j(E));if(N(E))return D(this.j(D(E)));if(0>this.l(b)&&0>E.l(b))return d(this.m()*E.m());for(var f=this.g.length+E.g.length,p=[],y=0;y<2*f;y++)p[y]=0;for(y=0;y<this.g.length;y++)for(var v=0;v<E.g.length;v++){var R=this.i(y)>>>16,g=this.i(y)&65535,Ue=E.i(v)>>>16,$t=E.i(v)&65535;p[2*y+2*v]+=g*$t,H(p,2*y+2*v),p[2*y+2*v+1]+=R*$t,H(p,2*y+2*v+1),p[2*y+2*v+1]+=g*Ue,H(p,2*y+2*v+1),p[2*y+2*v+2]+=R*Ue,H(p,2*y+2*v+2)}for(y=0;y<f;y++)p[y]=p[2*y+1]<<16|p[2*y];for(y=f;y<2*f;y++)p[y]=0;return new a(p,0)};function H(E,f){for(;(E[f]&65535)!=E[f];)E[f+1]+=E[f]>>>16,E[f]&=65535,f++}function Q(E,f){this.g=E,this.h=f}function re(E,f){if(k(f))throw Error("division by zero");if(k(E))return new Q(w,w);if(N(E))return f=re(D(E),f),new Q(D(f.g),D(f.h));if(N(f))return f=re(E,D(f)),new Q(D(f.g),f.h);if(30<E.g.length){if(N(E)||N(f))throw Error("slowDivide_ only works with positive integers.");for(var p=A,y=f;0>=y.l(E);)p=Le(p),y=Le(y);var v=oe(p,1),R=oe(y,1);for(y=oe(y,2),p=oe(p,2);!k(y);){var g=R.add(y);0>=g.l(E)&&(v=v.add(p),R=g),y=oe(y,1),p=oe(p,1)}return f=K(E,v.j(f)),new Q(v,f)}for(v=w;0<=E.l(f);){for(p=Math.max(1,Math.floor(E.m()/f.m())),y=Math.ceil(Math.log(p)/Math.LN2),y=48>=y?1:Math.pow(2,y-48),R=d(p),g=R.j(f);N(g)||0<g.l(E);)p-=y,R=d(p),g=R.j(f);k(R)&&(R=A),v=v.add(R),E=K(E,g)}return new Q(v,E)}n.A=function(E){return re(this,E).h},n.and=function(E){for(var f=Math.max(this.g.length,E.g.length),p=[],y=0;y<f;y++)p[y]=this.i(y)&E.i(y);return new a(p,this.h&E.h)},n.or=function(E){for(var f=Math.max(this.g.length,E.g.length),p=[],y=0;y<f;y++)p[y]=this.i(y)|E.i(y);return new a(p,this.h|E.h)},n.xor=function(E){for(var f=Math.max(this.g.length,E.g.length),p=[],y=0;y<f;y++)p[y]=this.i(y)^E.i(y);return new a(p,this.h^E.h)};function Le(E){for(var f=E.g.length+1,p=[],y=0;y<f;y++)p[y]=E.i(y)<<1|E.i(y-1)>>>31;return new a(p,E.h)}function oe(E,f){var p=f>>5;f%=32;for(var y=E.g.length-p,v=[],R=0;R<y;R++)v[R]=0<f?E.i(R+p)>>>f|E.i(R+p+1)<<32-f:E.i(R+p);return new a(v,E.h)}r.prototype.digest=r.prototype.v,r.prototype.reset=r.prototype.s,r.prototype.update=r.prototype.u,xl=r,a.prototype.add=a.prototype.add,a.prototype.multiply=a.prototype.j,a.prototype.modulo=a.prototype.A,a.prototype.compare=a.prototype.l,a.prototype.toNumber=a.prototype.m,a.prototype.toString=a.prototype.toString,a.prototype.getBits=a.prototype.i,a.fromNumber=d,a.fromString=m,pt=a}).apply(typeof fa<"u"?fa:typeof self<"u"?self:typeof window<"u"?window:{});var nr=typeof globalThis<"u"?globalThis:typeof window<"u"?window:typeof global<"u"?global:typeof self<"u"?self:{};/** @license
Copyright The Closure Library Authors.
SPDX-License-Identifier: Apache-2.0
*/var Fl,un,Ll,ar,xs,Ul,zl,jl;(function(){var n,e=typeof Object.defineProperties=="function"?Object.defineProperty:function(i,l,u){return i==Array.prototype||i==Object.prototype||(i[l]=u.value),i};function t(i){i=[typeof globalThis=="object"&&globalThis,i,typeof window=="object"&&window,typeof self=="object"&&self,typeof nr=="object"&&nr];for(var l=0;l<i.length;++l){var u=i[l];if(u&&u.Math==Math)return u}throw Error("Cannot find global object")}var r=t(this);function s(i,l){if(l)e:{var u=r;i=i.split(".");for(var _=0;_<i.length-1;_++){var T=i[_];if(!(T in u))break e;u=u[T]}i=i[i.length-1],_=u[i],l=l(_),l!=_&&l!=null&&e(u,i,{configurable:!0,writable:!0,value:l})}}function o(i,l){i instanceof String&&(i+="");var u=0,_=!1,T={next:function(){if(!_&&u<i.length){var I=u++;return{value:l(I,i[I]),done:!1}}return _=!0,{done:!0,value:void 0}}};return T[Symbol.iterator]=function(){return T},T}s("Array.prototype.values",function(i){return i||function(){return o(this,function(l,u){return u})}});/** @license

 Copyright The Closure Library Authors.
 SPDX-License-Identifier: Apache-2.0
*/var a=a||{},c=this||self;function h(i){var l=typeof i;return l=l!="object"?l:i?Array.isArray(i)?"array":l:"null",l=="array"||l=="object"&&typeof i.length=="number"}function d(i){var l=typeof i;return l=="object"&&i!=null||l=="function"}function m(i,l,u){return i.call.apply(i.bind,arguments)}function w(i,l,u){if(!i)throw Error();if(2<arguments.length){var _=Array.prototype.slice.call(arguments,2);return function(){var T=Array.prototype.slice.call(arguments);return Array.prototype.unshift.apply(T,_),i.apply(l,T)}}return function(){return i.apply(l,arguments)}}function A(i,l,u){return A=Function.prototype.bind&&Function.prototype.bind.toString().indexOf("native code")!=-1?m:w,A.apply(null,arguments)}function b(i,l){var u=Array.prototype.slice.call(arguments,1);return function(){var _=u.slice();return _.push.apply(_,arguments),i.apply(this,_)}}function k(i,l){function u(){}u.prototype=l.prototype,i.aa=l.prototype,i.prototype=new u,i.prototype.constructor=i,i.Qb=function(_,T,I){for(var P=Array(arguments.length-2),W=2;W<arguments.length;W++)P[W-2]=arguments[W];return l.prototype[T].apply(_,P)}}function N(i){const l=i.length;if(0<l){const u=Array(l);for(let _=0;_<l;_++)u[_]=i[_];return u}return[]}function D(i,l){for(let u=1;u<arguments.length;u++){const _=arguments[u];if(h(_)){const T=i.length||0,I=_.length||0;i.length=T+I;for(let P=0;P<I;P++)i[T+P]=_[P]}else i.push(_)}}class K{constructor(l,u){this.i=l,this.j=u,this.h=0,this.g=null}get(){let l;return 0<this.h?(this.h--,l=this.g,this.g=l.next,l.next=null):l=this.i(),l}}function H(i){return/^[\s\xa0]*$/.test(i)}function Q(){var i=c.navigator;return i&&(i=i.userAgent)?i:""}function re(i){return re[" "](i),i}re[" "]=function(){};var Le=Q().indexOf("Gecko")!=-1&&!(Q().toLowerCase().indexOf("webkit")!=-1&&Q().indexOf("Edge")==-1)&&!(Q().indexOf("Trident")!=-1||Q().indexOf("MSIE")!=-1)&&Q().indexOf("Edge")==-1;function oe(i,l,u){for(const _ in i)l.call(u,i[_],_,i)}function E(i,l){for(const u in i)l.call(void 0,i[u],u,i)}function f(i){const l={};for(const u in i)l[u]=i[u];return l}const p="constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf".split(" ");function y(i,l){let u,_;for(let T=1;T<arguments.length;T++){_=arguments[T];for(u in _)i[u]=_[u];for(let I=0;I<p.length;I++)u=p[I],Object.prototype.hasOwnProperty.call(_,u)&&(i[u]=_[u])}}function v(i){var l=1;i=i.split(":");const u=[];for(;0<l&&i.length;)u.push(i.shift()),l--;return i.length&&u.push(i.join(":")),u}function R(i){c.setTimeout(()=>{throw i},0)}function g(){var i=$r;let l=null;return i.g&&(l=i.g,i.g=i.g.next,i.g||(i.h=null),l.next=null),l}class Ue{constructor(){this.h=this.g=null}add(l,u){const _=$t.get();_.set(l,u),this.h?this.h.next=_:this.g=_,this.h=_}}var $t=new K(()=>new gu,i=>i.reset());class gu{constructor(){this.next=this.g=this.h=null}set(l,u){this.h=l,this.g=u,this.next=null}reset(){this.next=this.g=this.h=null}}let Gt,Kt=!1,$r=new Ue,Gi=()=>{const i=c.Promise.resolve(void 0);Gt=()=>{i.then(pu)}};var pu=()=>{for(var i;i=g();){try{i.h.call(i.g)}catch(u){R(u)}var l=$t;l.j(i),100>l.h&&(l.h++,i.next=l.g,l.g=i)}Kt=!1};function Ye(){this.s=this.s,this.C=this.C}Ye.prototype.s=!1,Ye.prototype.ma=function(){this.s||(this.s=!0,this.N())},Ye.prototype.N=function(){if(this.C)for(;this.C.length;)this.C.shift()()};function de(i,l){this.type=i,this.g=this.target=l,this.defaultPrevented=!1}de.prototype.h=function(){this.defaultPrevented=!0};var yu=(function(){if(!c.addEventListener||!Object.defineProperty)return!1;var i=!1,l=Object.defineProperty({},"passive",{get:function(){i=!0}});try{const u=()=>{};c.addEventListener("test",u,l),c.removeEventListener("test",u,l)}catch{}return i})();function Ht(i,l){if(de.call(this,i?i.type:""),this.relatedTarget=this.g=this.target=null,this.button=this.screenY=this.screenX=this.clientY=this.clientX=0,this.key="",this.metaKey=this.shiftKey=this.altKey=this.ctrlKey=!1,this.state=null,this.pointerId=0,this.pointerType="",this.i=null,i){var u=this.type=i.type,_=i.changedTouches&&i.changedTouches.length?i.changedTouches[0]:null;if(this.target=i.target||i.srcElement,this.g=l,l=i.relatedTarget){if(Le){e:{try{re(l.nodeName);var T=!0;break e}catch{}T=!1}T||(l=null)}}else u=="mouseover"?l=i.fromElement:u=="mouseout"&&(l=i.toElement);this.relatedTarget=l,_?(this.clientX=_.clientX!==void 0?_.clientX:_.pageX,this.clientY=_.clientY!==void 0?_.clientY:_.pageY,this.screenX=_.screenX||0,this.screenY=_.screenY||0):(this.clientX=i.clientX!==void 0?i.clientX:i.pageX,this.clientY=i.clientY!==void 0?i.clientY:i.pageY,this.screenX=i.screenX||0,this.screenY=i.screenY||0),this.button=i.button,this.key=i.key||"",this.ctrlKey=i.ctrlKey,this.altKey=i.altKey,this.shiftKey=i.shiftKey,this.metaKey=i.metaKey,this.pointerId=i.pointerId||0,this.pointerType=typeof i.pointerType=="string"?i.pointerType:vu[i.pointerType]||"",this.state=i.state,this.i=i,i.defaultPrevented&&Ht.aa.h.call(this)}}k(Ht,de);var vu={2:"touch",3:"pen",4:"mouse"};Ht.prototype.h=function(){Ht.aa.h.call(this);var i=this.i;i.preventDefault?i.preventDefault():i.returnValue=!1};var xn="closure_listenable_"+(1e6*Math.random()|0),Eu=0;function Tu(i,l,u,_,T){this.listener=i,this.proxy=null,this.src=l,this.type=u,this.capture=!!_,this.ha=T,this.key=++Eu,this.da=this.fa=!1}function Fn(i){i.da=!0,i.listener=null,i.proxy=null,i.src=null,i.ha=null}function Ln(i){this.src=i,this.g={},this.h=0}Ln.prototype.add=function(i,l,u,_,T){var I=i.toString();i=this.g[I],i||(i=this.g[I]=[],this.h++);var P=Kr(i,l,_,T);return-1<P?(l=i[P],u||(l.fa=!1)):(l=new Tu(l,this.src,I,!!_,T),l.fa=u,i.push(l)),l};function Gr(i,l){var u=l.type;if(u in i.g){var _=i.g[u],T=Array.prototype.indexOf.call(_,l,void 0),I;(I=0<=T)&&Array.prototype.splice.call(_,T,1),I&&(Fn(l),i.g[u].length==0&&(delete i.g[u],i.h--))}}function Kr(i,l,u,_){for(var T=0;T<i.length;++T){var I=i[T];if(!I.da&&I.listener==l&&I.capture==!!u&&I.ha==_)return T}return-1}var Hr="closure_lm_"+(1e6*Math.random()|0),Wr={};function Ki(i,l,u,_,T){if(Array.isArray(l)){for(var I=0;I<l.length;I++)Ki(i,l[I],u,_,T);return null}return u=Qi(u),i&&i[xn]?i.K(l,u,d(_)?!!_.capture:!1,T):Ru(i,l,u,!1,_,T)}function Ru(i,l,u,_,T,I){if(!l)throw Error("Invalid event type");var P=d(T)?!!T.capture:!!T,W=Yr(i);if(W||(i[Hr]=W=new Ln(i)),u=W.add(l,u,_,P,I),u.proxy)return u;if(_=wu(),u.proxy=_,_.src=i,_.listener=u,i.addEventListener)yu||(T=P),T===void 0&&(T=!1),i.addEventListener(l.toString(),_,T);else if(i.attachEvent)i.attachEvent(Wi(l.toString()),_);else if(i.addListener&&i.removeListener)i.addListener(_);else throw Error("addEventListener and attachEvent are unavailable.");return u}function wu(){function i(u){return l.call(i.src,i.listener,u)}const l=Au;return i}function Hi(i,l,u,_,T){if(Array.isArray(l))for(var I=0;I<l.length;I++)Hi(i,l[I],u,_,T);else _=d(_)?!!_.capture:!!_,u=Qi(u),i&&i[xn]?(i=i.i,l=String(l).toString(),l in i.g&&(I=i.g[l],u=Kr(I,u,_,T),-1<u&&(Fn(I[u]),Array.prototype.splice.call(I,u,1),I.length==0&&(delete i.g[l],i.h--)))):i&&(i=Yr(i))&&(l=i.g[l.toString()],i=-1,l&&(i=Kr(l,u,_,T)),(u=-1<i?l[i]:null)&&Qr(u))}function Qr(i){if(typeof i!="number"&&i&&!i.da){var l=i.src;if(l&&l[xn])Gr(l.i,i);else{var u=i.type,_=i.proxy;l.removeEventListener?l.removeEventListener(u,_,i.capture):l.detachEvent?l.detachEvent(Wi(u),_):l.addListener&&l.removeListener&&l.removeListener(_),(u=Yr(l))?(Gr(u,i),u.h==0&&(u.src=null,l[Hr]=null)):Fn(i)}}}function Wi(i){return i in Wr?Wr[i]:Wr[i]="on"+i}function Au(i,l){if(i.da)i=!0;else{l=new Ht(l,this);var u=i.listener,_=i.ha||i.src;i.fa&&Qr(i),i=u.call(_,l)}return i}function Yr(i){return i=i[Hr],i instanceof Ln?i:null}var Xr="__closure_events_fn_"+(1e9*Math.random()>>>0);function Qi(i){return typeof i=="function"?i:(i[Xr]||(i[Xr]=function(l){return i.handleEvent(l)}),i[Xr])}function _e(){Ye.call(this),this.i=new Ln(this),this.M=this,this.F=null}k(_e,Ye),_e.prototype[xn]=!0,_e.prototype.removeEventListener=function(i,l,u,_){Hi(this,i,l,u,_)};function ve(i,l){var u,_=i.F;if(_)for(u=[];_;_=_.F)u.push(_);if(i=i.M,_=l.type||l,typeof l=="string")l=new de(l,i);else if(l instanceof de)l.target=l.target||i;else{var T=l;l=new de(_,i),y(l,T)}if(T=!0,u)for(var I=u.length-1;0<=I;I--){var P=l.g=u[I];T=Un(P,_,!0,l)&&T}if(P=l.g=i,T=Un(P,_,!0,l)&&T,T=Un(P,_,!1,l)&&T,u)for(I=0;I<u.length;I++)P=l.g=u[I],T=Un(P,_,!1,l)&&T}_e.prototype.N=function(){if(_e.aa.N.call(this),this.i){var i=this.i,l;for(l in i.g){for(var u=i.g[l],_=0;_<u.length;_++)Fn(u[_]);delete i.g[l],i.h--}}this.F=null},_e.prototype.K=function(i,l,u,_){return this.i.add(String(i),l,!1,u,_)},_e.prototype.L=function(i,l,u,_){return this.i.add(String(i),l,!0,u,_)};function Un(i,l,u,_){if(l=i.i.g[String(l)],!l)return!0;l=l.concat();for(var T=!0,I=0;I<l.length;++I){var P=l[I];if(P&&!P.da&&P.capture==u){var W=P.listener,ae=P.ha||P.src;P.fa&&Gr(i.i,P),T=W.call(ae,_)!==!1&&T}}return T&&!_.defaultPrevented}function Yi(i,l,u){if(typeof i=="function")u&&(i=A(i,u));else if(i&&typeof i.handleEvent=="function")i=A(i.handleEvent,i);else throw Error("Invalid listener argument");return 2147483647<Number(l)?-1:c.setTimeout(i,l||0)}function Xi(i){i.g=Yi(()=>{i.g=null,i.i&&(i.i=!1,Xi(i))},i.l);const l=i.h;i.h=null,i.m.apply(null,l)}class Iu extends Ye{constructor(l,u){super(),this.m=l,this.l=u,this.h=null,this.i=!1,this.g=null}j(l){this.h=arguments,this.g?this.i=!0:Xi(this)}N(){super.N(),this.g&&(c.clearTimeout(this.g),this.g=null,this.i=!1,this.h=null)}}function Wt(i){Ye.call(this),this.h=i,this.g={}}k(Wt,Ye);var Ji=[];function Zi(i){oe(i.g,function(l,u){this.g.hasOwnProperty(u)&&Qr(l)},i),i.g={}}Wt.prototype.N=function(){Wt.aa.N.call(this),Zi(this)},Wt.prototype.handleEvent=function(){throw Error("EventHandler.handleEvent not implemented")};var Jr=c.JSON.stringify,bu=c.JSON.parse,Su=class{stringify(i){return c.JSON.stringify(i,void 0)}parse(i){return c.JSON.parse(i,void 0)}};function Zr(){}Zr.prototype.h=null;function eo(i){return i.h||(i.h=i.i())}function to(){}var Qt={OPEN:"a",kb:"b",Ja:"c",wb:"d"};function es(){de.call(this,"d")}k(es,de);function ts(){de.call(this,"c")}k(ts,de);var ut={},no=null;function zn(){return no=no||new _e}ut.La="serverreachability";function ro(i){de.call(this,ut.La,i)}k(ro,de);function Yt(i){const l=zn();ve(l,new ro(l))}ut.STAT_EVENT="statevent";function so(i,l){de.call(this,ut.STAT_EVENT,i),this.stat=l}k(so,de);function Ee(i){const l=zn();ve(l,new so(l,i))}ut.Ma="timingevent";function io(i,l){de.call(this,ut.Ma,i),this.size=l}k(io,de);function Xt(i,l){if(typeof i!="function")throw Error("Fn must not be null and must be a function");return c.setTimeout(function(){i()},l)}function Jt(){this.g=!0}Jt.prototype.xa=function(){this.g=!1};function Cu(i,l,u,_,T,I){i.info(function(){if(i.g)if(I)for(var P="",W=I.split("&"),ae=0;ae<W.length;ae++){var j=W[ae].split("=");if(1<j.length){var fe=j[0];j=j[1];var me=fe.split("_");P=2<=me.length&&me[1]=="type"?P+(fe+"="+j+"&"):P+(fe+"=redacted&")}}else P=null;else P=I;return"XMLHTTP REQ ("+_+") [attempt "+T+"]: "+l+`
`+u+`
`+P})}function Pu(i,l,u,_,T,I,P){i.info(function(){return"XMLHTTP RESP ("+_+") [ attempt "+T+"]: "+l+`
`+u+`
`+I+" "+P})}function It(i,l,u,_){i.info(function(){return"XMLHTTP TEXT ("+l+"): "+ku(i,u)+(_?" "+_:"")})}function Du(i,l){i.info(function(){return"TIMEOUT: "+l})}Jt.prototype.info=function(){};function ku(i,l){if(!i.g)return l;if(!l)return null;try{var u=JSON.parse(l);if(u){for(i=0;i<u.length;i++)if(Array.isArray(u[i])){var _=u[i];if(!(2>_.length)){var T=_[1];if(Array.isArray(T)&&!(1>T.length)){var I=T[0];if(I!="noop"&&I!="stop"&&I!="close")for(var P=1;P<T.length;P++)T[P]=""}}}}return Jr(u)}catch{return l}}var jn={NO_ERROR:0,gb:1,tb:2,sb:3,nb:4,rb:5,ub:6,Ia:7,TIMEOUT:8,xb:9},oo={lb:"complete",Hb:"success",Ja:"error",Ia:"abort",zb:"ready",Ab:"readystatechange",TIMEOUT:"timeout",vb:"incrementaldata",yb:"progress",ob:"downloadprogress",Pb:"uploadprogress"},ns;function qn(){}k(qn,Zr),qn.prototype.g=function(){return new XMLHttpRequest},qn.prototype.i=function(){return{}},ns=new qn;function Xe(i,l,u,_){this.j=i,this.i=l,this.l=u,this.R=_||1,this.U=new Wt(this),this.I=45e3,this.H=null,this.o=!1,this.m=this.A=this.v=this.L=this.F=this.S=this.B=null,this.D=[],this.g=null,this.C=0,this.s=this.u=null,this.X=-1,this.J=!1,this.O=0,this.M=null,this.W=this.K=this.T=this.P=!1,this.h=new ao}function ao(){this.i=null,this.g="",this.h=!1}var lo={},rs={};function ss(i,l,u){i.L=1,i.v=Hn(ze(l)),i.m=u,i.P=!0,co(i,null)}function co(i,l){i.F=Date.now(),$n(i),i.A=ze(i.v);var u=i.A,_=i.R;Array.isArray(_)||(_=[String(_)]),Ao(u.i,"t",_),i.C=0,u=i.j.J,i.h=new ao,i.g=jo(i.j,u?l:null,!i.m),0<i.O&&(i.M=new Iu(A(i.Y,i,i.g),i.O)),l=i.U,u=i.g,_=i.ca;var T="readystatechange";Array.isArray(T)||(T&&(Ji[0]=T.toString()),T=Ji);for(var I=0;I<T.length;I++){var P=Ki(u,T[I],_||l.handleEvent,!1,l.h||l);if(!P)break;l.g[P.key]=P}l=i.H?f(i.H):{},i.m?(i.u||(i.u="POST"),l["Content-Type"]="application/x-www-form-urlencoded",i.g.ea(i.A,i.u,i.m,l)):(i.u="GET",i.g.ea(i.A,i.u,null,l)),Yt(),Cu(i.i,i.u,i.A,i.l,i.R,i.m)}Xe.prototype.ca=function(i){i=i.target;const l=this.M;l&&je(i)==3?l.j():this.Y(i)},Xe.prototype.Y=function(i){try{if(i==this.g)e:{const me=je(this.g);var l=this.g.Ba();const Ct=this.g.Z();if(!(3>me)&&(me!=3||this.g&&(this.h.h||this.g.oa()||ko(this.g)))){this.J||me!=4||l==7||(l==8||0>=Ct?Yt(3):Yt(2)),is(this);var u=this.g.Z();this.X=u;t:if(uo(this)){var _=ko(this.g);i="";var T=_.length,I=je(this.g)==4;if(!this.h.i){if(typeof TextDecoder>"u"){ht(this),Zt(this);var P="";break t}this.h.i=new c.TextDecoder}for(l=0;l<T;l++)this.h.h=!0,i+=this.h.i.decode(_[l],{stream:!(I&&l==T-1)});_.length=0,this.h.g+=i,this.C=0,P=this.h.g}else P=this.g.oa();if(this.o=u==200,Pu(this.i,this.u,this.A,this.l,this.R,me,u),this.o){if(this.T&&!this.K){t:{if(this.g){var W,ae=this.g;if((W=ae.g?ae.g.getResponseHeader("X-HTTP-Initial-Response"):null)&&!H(W)){var j=W;break t}}j=null}if(u=j)It(this.i,this.l,u,"Initial handshake response via X-HTTP-Initial-Response"),this.K=!0,os(this,u);else{this.o=!1,this.s=3,Ee(12),ht(this),Zt(this);break e}}if(this.P){u=!0;let De;for(;!this.J&&this.C<P.length;)if(De=Vu(this,P),De==rs){me==4&&(this.s=4,Ee(14),u=!1),It(this.i,this.l,null,"[Incomplete Response]");break}else if(De==lo){this.s=4,Ee(15),It(this.i,this.l,P,"[Invalid Chunk]"),u=!1;break}else It(this.i,this.l,De,null),os(this,De);if(uo(this)&&this.C!=0&&(this.h.g=this.h.g.slice(this.C),this.C=0),me!=4||P.length!=0||this.h.h||(this.s=1,Ee(16),u=!1),this.o=this.o&&u,!u)It(this.i,this.l,P,"[Invalid Chunked Response]"),ht(this),Zt(this);else if(0<P.length&&!this.W){this.W=!0;var fe=this.j;fe.g==this&&fe.ba&&!fe.M&&(fe.j.info("Great, no buffering proxy detected. Bytes received: "+P.length),ds(fe),fe.M=!0,Ee(11))}}else It(this.i,this.l,P,null),os(this,P);me==4&&ht(this),this.o&&!this.J&&(me==4?Fo(this.j,this):(this.o=!1,$n(this)))}else Qu(this.g),u==400&&0<P.indexOf("Unknown SID")?(this.s=3,Ee(12)):(this.s=0,Ee(13)),ht(this),Zt(this)}}}catch{}finally{}};function uo(i){return i.g?i.u=="GET"&&i.L!=2&&i.j.Ca:!1}function Vu(i,l){var u=i.C,_=l.indexOf(`
`,u);return _==-1?rs:(u=Number(l.substring(u,_)),isNaN(u)?lo:(_+=1,_+u>l.length?rs:(l=l.slice(_,_+u),i.C=_+u,l)))}Xe.prototype.cancel=function(){this.J=!0,ht(this)};function $n(i){i.S=Date.now()+i.I,ho(i,i.I)}function ho(i,l){if(i.B!=null)throw Error("WatchDog timer not null");i.B=Xt(A(i.ba,i),l)}function is(i){i.B&&(c.clearTimeout(i.B),i.B=null)}Xe.prototype.ba=function(){this.B=null;const i=Date.now();0<=i-this.S?(Du(this.i,this.A),this.L!=2&&(Yt(),Ee(17)),ht(this),this.s=2,Zt(this)):ho(this,this.S-i)};function Zt(i){i.j.G==0||i.J||Fo(i.j,i)}function ht(i){is(i);var l=i.M;l&&typeof l.ma=="function"&&l.ma(),i.M=null,Zi(i.U),i.g&&(l=i.g,i.g=null,l.abort(),l.ma())}function os(i,l){try{var u=i.j;if(u.G!=0&&(u.g==i||as(u.h,i))){if(!i.K&&as(u.h,i)&&u.G==3){try{var _=u.Da.g.parse(l)}catch{_=null}if(Array.isArray(_)&&_.length==3){var T=_;if(T[0]==0){e:if(!u.u){if(u.g)if(u.g.F+3e3<i.F)Zn(u),Xn(u);else break e;hs(u),Ee(18)}}else u.za=T[1],0<u.za-u.T&&37500>T[2]&&u.F&&u.v==0&&!u.C&&(u.C=Xt(A(u.Za,u),6e3));if(1>=mo(u.h)&&u.ca){try{u.ca()}catch{}u.ca=void 0}}else _t(u,11)}else if((i.K||u.g==i)&&Zn(u),!H(l))for(T=u.Da.g.parse(l),l=0;l<T.length;l++){let j=T[l];if(u.T=j[0],j=j[1],u.G==2)if(j[0]=="c"){u.K=j[1],u.ia=j[2];const fe=j[3];fe!=null&&(u.la=fe,u.j.info("VER="+u.la));const me=j[4];me!=null&&(u.Aa=me,u.j.info("SVER="+u.Aa));const Ct=j[5];Ct!=null&&typeof Ct=="number"&&0<Ct&&(_=1.5*Ct,u.L=_,u.j.info("backChannelRequestTimeoutMs_="+_)),_=u;const De=i.g;if(De){const tr=De.g?De.g.getResponseHeader("X-Client-Wire-Protocol"):null;if(tr){var I=_.h;I.g||tr.indexOf("spdy")==-1&&tr.indexOf("quic")==-1&&tr.indexOf("h2")==-1||(I.j=I.l,I.g=new Set,I.h&&(ls(I,I.h),I.h=null))}if(_.D){const _s=De.g?De.g.getResponseHeader("X-HTTP-Session-Id"):null;_s&&(_.ya=_s,Y(_.I,_.D,_s))}}u.G=3,u.l&&u.l.ua(),u.ba&&(u.R=Date.now()-i.F,u.j.info("Handshake RTT: "+u.R+"ms")),_=u;var P=i;if(_.qa=zo(_,_.J?_.ia:null,_.W),P.K){go(_.h,P);var W=P,ae=_.L;ae&&(W.I=ae),W.B&&(is(W),$n(W)),_.g=P}else Mo(_);0<u.i.length&&Jn(u)}else j[0]!="stop"&&j[0]!="close"||_t(u,7);else u.G==3&&(j[0]=="stop"||j[0]=="close"?j[0]=="stop"?_t(u,7):us(u):j[0]!="noop"&&u.l&&u.l.ta(j),u.v=0)}}Yt(4)}catch{}}var Bu=class{constructor(i,l){this.g=i,this.map=l}};function _o(i){this.l=i||10,c.PerformanceNavigationTiming?(i=c.performance.getEntriesByType("navigation"),i=0<i.length&&(i[0].nextHopProtocol=="hq"||i[0].nextHopProtocol=="h2")):i=!!(c.chrome&&c.chrome.loadTimes&&c.chrome.loadTimes()&&c.chrome.loadTimes().wasFetchedViaSpdy),this.j=i?this.l:1,this.g=null,1<this.j&&(this.g=new Set),this.h=null,this.i=[]}function fo(i){return i.h?!0:i.g?i.g.size>=i.j:!1}function mo(i){return i.h?1:i.g?i.g.size:0}function as(i,l){return i.h?i.h==l:i.g?i.g.has(l):!1}function ls(i,l){i.g?i.g.add(l):i.h=l}function go(i,l){i.h&&i.h==l?i.h=null:i.g&&i.g.has(l)&&i.g.delete(l)}_o.prototype.cancel=function(){if(this.i=po(this),this.h)this.h.cancel(),this.h=null;else if(this.g&&this.g.size!==0){for(const i of this.g.values())i.cancel();this.g.clear()}};function po(i){if(i.h!=null)return i.i.concat(i.h.D);if(i.g!=null&&i.g.size!==0){let l=i.i;for(const u of i.g.values())l=l.concat(u.D);return l}return N(i.i)}function Nu(i){if(i.V&&typeof i.V=="function")return i.V();if(typeof Map<"u"&&i instanceof Map||typeof Set<"u"&&i instanceof Set)return Array.from(i.values());if(typeof i=="string")return i.split("");if(h(i)){for(var l=[],u=i.length,_=0;_<u;_++)l.push(i[_]);return l}l=[],u=0;for(_ in i)l[u++]=i[_];return l}function Ou(i){if(i.na&&typeof i.na=="function")return i.na();if(!i.V||typeof i.V!="function"){if(typeof Map<"u"&&i instanceof Map)return Array.from(i.keys());if(!(typeof Set<"u"&&i instanceof Set)){if(h(i)||typeof i=="string"){var l=[];i=i.length;for(var u=0;u<i;u++)l.push(u);return l}l=[],u=0;for(const _ in i)l[u++]=_;return l}}}function yo(i,l){if(i.forEach&&typeof i.forEach=="function")i.forEach(l,void 0);else if(h(i)||typeof i=="string")Array.prototype.forEach.call(i,l,void 0);else for(var u=Ou(i),_=Nu(i),T=_.length,I=0;I<T;I++)l.call(void 0,_[I],u&&u[I],i)}var vo=RegExp("^(?:([^:/?#.]+):)?(?://(?:([^\\\\/?#]*)@)?([^\\\\/?#]*?)(?::([0-9]+))?(?=[\\\\/?#]|$))?([^?#]+)?(?:\\?([^#]*))?(?:#([\\s\\S]*))?$");function Mu(i,l){if(i){i=i.split("&");for(var u=0;u<i.length;u++){var _=i[u].indexOf("="),T=null;if(0<=_){var I=i[u].substring(0,_);T=i[u].substring(_+1)}else I=i[u];l(I,T?decodeURIComponent(T.replace(/\+/g," ")):"")}}}function dt(i){if(this.g=this.o=this.j="",this.s=null,this.m=this.l="",this.h=!1,i instanceof dt){this.h=i.h,Gn(this,i.j),this.o=i.o,this.g=i.g,Kn(this,i.s),this.l=i.l;var l=i.i,u=new nn;u.i=l.i,l.g&&(u.g=new Map(l.g),u.h=l.h),Eo(this,u),this.m=i.m}else i&&(l=String(i).match(vo))?(this.h=!1,Gn(this,l[1]||"",!0),this.o=en(l[2]||""),this.g=en(l[3]||"",!0),Kn(this,l[4]),this.l=en(l[5]||"",!0),Eo(this,l[6]||"",!0),this.m=en(l[7]||"")):(this.h=!1,this.i=new nn(null,this.h))}dt.prototype.toString=function(){var i=[],l=this.j;l&&i.push(tn(l,To,!0),":");var u=this.g;return(u||l=="file")&&(i.push("//"),(l=this.o)&&i.push(tn(l,To,!0),"@"),i.push(encodeURIComponent(String(u)).replace(/%25([0-9a-fA-F]{2})/g,"%$1")),u=this.s,u!=null&&i.push(":",String(u))),(u=this.l)&&(this.g&&u.charAt(0)!="/"&&i.push("/"),i.push(tn(u,u.charAt(0)=="/"?Lu:Fu,!0))),(u=this.i.toString())&&i.push("?",u),(u=this.m)&&i.push("#",tn(u,zu)),i.join("")};function ze(i){return new dt(i)}function Gn(i,l,u){i.j=u?en(l,!0):l,i.j&&(i.j=i.j.replace(/:$/,""))}function Kn(i,l){if(l){if(l=Number(l),isNaN(l)||0>l)throw Error("Bad port number "+l);i.s=l}else i.s=null}function Eo(i,l,u){l instanceof nn?(i.i=l,ju(i.i,i.h)):(u||(l=tn(l,Uu)),i.i=new nn(l,i.h))}function Y(i,l,u){i.i.set(l,u)}function Hn(i){return Y(i,"zx",Math.floor(2147483648*Math.random()).toString(36)+Math.abs(Math.floor(2147483648*Math.random())^Date.now()).toString(36)),i}function en(i,l){return i?l?decodeURI(i.replace(/%25/g,"%2525")):decodeURIComponent(i):""}function tn(i,l,u){return typeof i=="string"?(i=encodeURI(i).replace(l,xu),u&&(i=i.replace(/%25([0-9a-fA-F]{2})/g,"%$1")),i):null}function xu(i){return i=i.charCodeAt(0),"%"+(i>>4&15).toString(16)+(i&15).toString(16)}var To=/[#\/\?@]/g,Fu=/[#\?:]/g,Lu=/[#\?]/g,Uu=/[#\?@]/g,zu=/#/g;function nn(i,l){this.h=this.g=null,this.i=i||null,this.j=!!l}function Je(i){i.g||(i.g=new Map,i.h=0,i.i&&Mu(i.i,function(l,u){i.add(decodeURIComponent(l.replace(/\+/g," ")),u)}))}n=nn.prototype,n.add=function(i,l){Je(this),this.i=null,i=bt(this,i);var u=this.g.get(i);return u||this.g.set(i,u=[]),u.push(l),this.h+=1,this};function Ro(i,l){Je(i),l=bt(i,l),i.g.has(l)&&(i.i=null,i.h-=i.g.get(l).length,i.g.delete(l))}function wo(i,l){return Je(i),l=bt(i,l),i.g.has(l)}n.forEach=function(i,l){Je(this),this.g.forEach(function(u,_){u.forEach(function(T){i.call(l,T,_,this)},this)},this)},n.na=function(){Je(this);const i=Array.from(this.g.values()),l=Array.from(this.g.keys()),u=[];for(let _=0;_<l.length;_++){const T=i[_];for(let I=0;I<T.length;I++)u.push(l[_])}return u},n.V=function(i){Je(this);let l=[];if(typeof i=="string")wo(this,i)&&(l=l.concat(this.g.get(bt(this,i))));else{i=Array.from(this.g.values());for(let u=0;u<i.length;u++)l=l.concat(i[u])}return l},n.set=function(i,l){return Je(this),this.i=null,i=bt(this,i),wo(this,i)&&(this.h-=this.g.get(i).length),this.g.set(i,[l]),this.h+=1,this},n.get=function(i,l){return i?(i=this.V(i),0<i.length?String(i[0]):l):l};function Ao(i,l,u){Ro(i,l),0<u.length&&(i.i=null,i.g.set(bt(i,l),N(u)),i.h+=u.length)}n.toString=function(){if(this.i)return this.i;if(!this.g)return"";const i=[],l=Array.from(this.g.keys());for(var u=0;u<l.length;u++){var _=l[u];const I=encodeURIComponent(String(_)),P=this.V(_);for(_=0;_<P.length;_++){var T=I;P[_]!==""&&(T+="="+encodeURIComponent(String(P[_]))),i.push(T)}}return this.i=i.join("&")};function bt(i,l){return l=String(l),i.j&&(l=l.toLowerCase()),l}function ju(i,l){l&&!i.j&&(Je(i),i.i=null,i.g.forEach(function(u,_){var T=_.toLowerCase();_!=T&&(Ro(this,_),Ao(this,T,u))},i)),i.j=l}function qu(i,l){const u=new Jt;if(c.Image){const _=new Image;_.onload=b(Ze,u,"TestLoadImage: loaded",!0,l,_),_.onerror=b(Ze,u,"TestLoadImage: error",!1,l,_),_.onabort=b(Ze,u,"TestLoadImage: abort",!1,l,_),_.ontimeout=b(Ze,u,"TestLoadImage: timeout",!1,l,_),c.setTimeout(function(){_.ontimeout&&_.ontimeout()},1e4),_.src=i}else l(!1)}function $u(i,l){const u=new Jt,_=new AbortController,T=setTimeout(()=>{_.abort(),Ze(u,"TestPingServer: timeout",!1,l)},1e4);fetch(i,{signal:_.signal}).then(I=>{clearTimeout(T),I.ok?Ze(u,"TestPingServer: ok",!0,l):Ze(u,"TestPingServer: server error",!1,l)}).catch(()=>{clearTimeout(T),Ze(u,"TestPingServer: error",!1,l)})}function Ze(i,l,u,_,T){try{T&&(T.onload=null,T.onerror=null,T.onabort=null,T.ontimeout=null),_(u)}catch{}}function Gu(){this.g=new Su}function Ku(i,l,u){const _=u||"";try{yo(i,function(T,I){let P=T;d(T)&&(P=Jr(T)),l.push(_+I+"="+encodeURIComponent(P))})}catch(T){throw l.push(_+"type="+encodeURIComponent("_badmap")),T}}function Wn(i){this.l=i.Ub||null,this.j=i.eb||!1}k(Wn,Zr),Wn.prototype.g=function(){return new Qn(this.l,this.j)},Wn.prototype.i=(function(i){return function(){return i}})({});function Qn(i,l){_e.call(this),this.D=i,this.o=l,this.m=void 0,this.status=this.readyState=0,this.responseType=this.responseText=this.response=this.statusText="",this.onreadystatechange=null,this.u=new Headers,this.h=null,this.B="GET",this.A="",this.g=!1,this.v=this.j=this.l=null}k(Qn,_e),n=Qn.prototype,n.open=function(i,l){if(this.readyState!=0)throw this.abort(),Error("Error reopening a connection");this.B=i,this.A=l,this.readyState=1,sn(this)},n.send=function(i){if(this.readyState!=1)throw this.abort(),Error("need to call open() first. ");this.g=!0;const l={headers:this.u,method:this.B,credentials:this.m,cache:void 0};i&&(l.body=i),(this.D||c).fetch(new Request(this.A,l)).then(this.Sa.bind(this),this.ga.bind(this))},n.abort=function(){this.response=this.responseText="",this.u=new Headers,this.status=0,this.j&&this.j.cancel("Request was aborted.").catch(()=>{}),1<=this.readyState&&this.g&&this.readyState!=4&&(this.g=!1,rn(this)),this.readyState=0},n.Sa=function(i){if(this.g&&(this.l=i,this.h||(this.status=this.l.status,this.statusText=this.l.statusText,this.h=i.headers,this.readyState=2,sn(this)),this.g&&(this.readyState=3,sn(this),this.g)))if(this.responseType==="arraybuffer")i.arrayBuffer().then(this.Qa.bind(this),this.ga.bind(this));else if(typeof c.ReadableStream<"u"&&"body"in i){if(this.j=i.body.getReader(),this.o){if(this.responseType)throw Error('responseType must be empty for "streamBinaryChunks" mode responses.');this.response=[]}else this.response=this.responseText="",this.v=new TextDecoder;Io(this)}else i.text().then(this.Ra.bind(this),this.ga.bind(this))};function Io(i){i.j.read().then(i.Pa.bind(i)).catch(i.ga.bind(i))}n.Pa=function(i){if(this.g){if(this.o&&i.value)this.response.push(i.value);else if(!this.o){var l=i.value?i.value:new Uint8Array(0);(l=this.v.decode(l,{stream:!i.done}))&&(this.response=this.responseText+=l)}i.done?rn(this):sn(this),this.readyState==3&&Io(this)}},n.Ra=function(i){this.g&&(this.response=this.responseText=i,rn(this))},n.Qa=function(i){this.g&&(this.response=i,rn(this))},n.ga=function(){this.g&&rn(this)};function rn(i){i.readyState=4,i.l=null,i.j=null,i.v=null,sn(i)}n.setRequestHeader=function(i,l){this.u.append(i,l)},n.getResponseHeader=function(i){return this.h&&this.h.get(i.toLowerCase())||""},n.getAllResponseHeaders=function(){if(!this.h)return"";const i=[],l=this.h.entries();for(var u=l.next();!u.done;)u=u.value,i.push(u[0]+": "+u[1]),u=l.next();return i.join(`\r
`)};function sn(i){i.onreadystatechange&&i.onreadystatechange.call(i)}Object.defineProperty(Qn.prototype,"withCredentials",{get:function(){return this.m==="include"},set:function(i){this.m=i?"include":"same-origin"}});function bo(i){let l="";return oe(i,function(u,_){l+=_,l+=":",l+=u,l+=`\r
`}),l}function cs(i,l,u){e:{for(_ in u){var _=!1;break e}_=!0}_||(u=bo(u),typeof i=="string"?u!=null&&encodeURIComponent(String(u)):Y(i,l,u))}function Z(i){_e.call(this),this.headers=new Map,this.o=i||null,this.h=!1,this.v=this.g=null,this.D="",this.m=0,this.l="",this.j=this.B=this.u=this.A=!1,this.I=null,this.H="",this.J=!1}k(Z,_e);var Hu=/^https?$/i,Wu=["POST","PUT"];n=Z.prototype,n.Ha=function(i){this.J=i},n.ea=function(i,l,u,_){if(this.g)throw Error("[goog.net.XhrIo] Object is active with another request="+this.D+"; newUri="+i);l=l?l.toUpperCase():"GET",this.D=i,this.l="",this.m=0,this.A=!1,this.h=!0,this.g=this.o?this.o.g():ns.g(),this.v=this.o?eo(this.o):eo(ns),this.g.onreadystatechange=A(this.Ea,this);try{this.B=!0,this.g.open(l,String(i),!0),this.B=!1}catch(I){So(this,I);return}if(i=u||"",u=new Map(this.headers),_)if(Object.getPrototypeOf(_)===Object.prototype)for(var T in _)u.set(T,_[T]);else if(typeof _.keys=="function"&&typeof _.get=="function")for(const I of _.keys())u.set(I,_.get(I));else throw Error("Unknown input type for opt_headers: "+String(_));_=Array.from(u.keys()).find(I=>I.toLowerCase()=="content-type"),T=c.FormData&&i instanceof c.FormData,!(0<=Array.prototype.indexOf.call(Wu,l,void 0))||_||T||u.set("Content-Type","application/x-www-form-urlencoded;charset=utf-8");for(const[I,P]of u)this.g.setRequestHeader(I,P);this.H&&(this.g.responseType=this.H),"withCredentials"in this.g&&this.g.withCredentials!==this.J&&(this.g.withCredentials=this.J);try{Do(this),this.u=!0,this.g.send(i),this.u=!1}catch(I){So(this,I)}};function So(i,l){i.h=!1,i.g&&(i.j=!0,i.g.abort(),i.j=!1),i.l=l,i.m=5,Co(i),Yn(i)}function Co(i){i.A||(i.A=!0,ve(i,"complete"),ve(i,"error"))}n.abort=function(i){this.g&&this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1,this.m=i||7,ve(this,"complete"),ve(this,"abort"),Yn(this))},n.N=function(){this.g&&(this.h&&(this.h=!1,this.j=!0,this.g.abort(),this.j=!1),Yn(this,!0)),Z.aa.N.call(this)},n.Ea=function(){this.s||(this.B||this.u||this.j?Po(this):this.bb())},n.bb=function(){Po(this)};function Po(i){if(i.h&&typeof a<"u"&&(!i.v[1]||je(i)!=4||i.Z()!=2)){if(i.u&&je(i)==4)Yi(i.Ea,0,i);else if(ve(i,"readystatechange"),je(i)==4){i.h=!1;try{const P=i.Z();e:switch(P){case 200:case 201:case 202:case 204:case 206:case 304:case 1223:var l=!0;break e;default:l=!1}var u;if(!(u=l)){var _;if(_=P===0){var T=String(i.D).match(vo)[1]||null;!T&&c.self&&c.self.location&&(T=c.self.location.protocol.slice(0,-1)),_=!Hu.test(T?T.toLowerCase():"")}u=_}if(u)ve(i,"complete"),ve(i,"success");else{i.m=6;try{var I=2<je(i)?i.g.statusText:""}catch{I=""}i.l=I+" ["+i.Z()+"]",Co(i)}}finally{Yn(i)}}}}function Yn(i,l){if(i.g){Do(i);const u=i.g,_=i.v[0]?()=>{}:null;i.g=null,i.v=null,l||ve(i,"ready");try{u.onreadystatechange=_}catch{}}}function Do(i){i.I&&(c.clearTimeout(i.I),i.I=null)}n.isActive=function(){return!!this.g};function je(i){return i.g?i.g.readyState:0}n.Z=function(){try{return 2<je(this)?this.g.status:-1}catch{return-1}},n.oa=function(){try{return this.g?this.g.responseText:""}catch{return""}},n.Oa=function(i){if(this.g){var l=this.g.responseText;return i&&l.indexOf(i)==0&&(l=l.substring(i.length)),bu(l)}};function ko(i){try{if(!i.g)return null;if("response"in i.g)return i.g.response;switch(i.H){case"":case"text":return i.g.responseText;case"arraybuffer":if("mozResponseArrayBuffer"in i.g)return i.g.mozResponseArrayBuffer}return null}catch{return null}}function Qu(i){const l={};i=(i.g&&2<=je(i)&&i.g.getAllResponseHeaders()||"").split(`\r
`);for(let _=0;_<i.length;_++){if(H(i[_]))continue;var u=v(i[_]);const T=u[0];if(u=u[1],typeof u!="string")continue;u=u.trim();const I=l[T]||[];l[T]=I,I.push(u)}E(l,function(_){return _.join(", ")})}n.Ba=function(){return this.m},n.Ka=function(){return typeof this.l=="string"?this.l:String(this.l)};function on(i,l,u){return u&&u.internalChannelParams&&u.internalChannelParams[i]||l}function Vo(i){this.Aa=0,this.i=[],this.j=new Jt,this.ia=this.qa=this.I=this.W=this.g=this.ya=this.D=this.H=this.m=this.S=this.o=null,this.Ya=this.U=0,this.Va=on("failFast",!1,i),this.F=this.C=this.u=this.s=this.l=null,this.X=!0,this.za=this.T=-1,this.Y=this.v=this.B=0,this.Ta=on("baseRetryDelayMs",5e3,i),this.cb=on("retryDelaySeedMs",1e4,i),this.Wa=on("forwardChannelMaxRetries",2,i),this.wa=on("forwardChannelRequestTimeoutMs",2e4,i),this.pa=i&&i.xmlHttpFactory||void 0,this.Xa=i&&i.Tb||void 0,this.Ca=i&&i.useFetchStreams||!1,this.L=void 0,this.J=i&&i.supportsCrossDomainXhr||!1,this.K="",this.h=new _o(i&&i.concurrentRequestLimit),this.Da=new Gu,this.P=i&&i.fastHandshake||!1,this.O=i&&i.encodeInitMessageHeaders||!1,this.P&&this.O&&(this.O=!1),this.Ua=i&&i.Rb||!1,i&&i.xa&&this.j.xa(),i&&i.forceLongPolling&&(this.X=!1),this.ba=!this.P&&this.X&&i&&i.detectBufferingProxy||!1,this.ja=void 0,i&&i.longPollingTimeout&&0<i.longPollingTimeout&&(this.ja=i.longPollingTimeout),this.ca=void 0,this.R=0,this.M=!1,this.ka=this.A=null}n=Vo.prototype,n.la=8,n.G=1,n.connect=function(i,l,u,_){Ee(0),this.W=i,this.H=l||{},u&&_!==void 0&&(this.H.OSID=u,this.H.OAID=_),this.F=this.X,this.I=zo(this,null,this.W),Jn(this)};function us(i){if(Bo(i),i.G==3){var l=i.U++,u=ze(i.I);if(Y(u,"SID",i.K),Y(u,"RID",l),Y(u,"TYPE","terminate"),an(i,u),l=new Xe(i,i.j,l),l.L=2,l.v=Hn(ze(u)),u=!1,c.navigator&&c.navigator.sendBeacon)try{u=c.navigator.sendBeacon(l.v.toString(),"")}catch{}!u&&c.Image&&(new Image().src=l.v,u=!0),u||(l.g=jo(l.j,null),l.g.ea(l.v)),l.F=Date.now(),$n(l)}Uo(i)}function Xn(i){i.g&&(ds(i),i.g.cancel(),i.g=null)}function Bo(i){Xn(i),i.u&&(c.clearTimeout(i.u),i.u=null),Zn(i),i.h.cancel(),i.s&&(typeof i.s=="number"&&c.clearTimeout(i.s),i.s=null)}function Jn(i){if(!fo(i.h)&&!i.s){i.s=!0;var l=i.Ga;Gt||Gi(),Kt||(Gt(),Kt=!0),$r.add(l,i),i.B=0}}function Yu(i,l){return mo(i.h)>=i.h.j-(i.s?1:0)?!1:i.s?(i.i=l.D.concat(i.i),!0):i.G==1||i.G==2||i.B>=(i.Va?0:i.Wa)?!1:(i.s=Xt(A(i.Ga,i,l),Lo(i,i.B)),i.B++,!0)}n.Ga=function(i){if(this.s)if(this.s=null,this.G==1){if(!i){this.U=Math.floor(1e5*Math.random()),i=this.U++;const T=new Xe(this,this.j,i);let I=this.o;if(this.S&&(I?(I=f(I),y(I,this.S)):I=this.S),this.m!==null||this.O||(T.H=I,I=null),this.P)e:{for(var l=0,u=0;u<this.i.length;u++){t:{var _=this.i[u];if("__data__"in _.map&&(_=_.map.__data__,typeof _=="string")){_=_.length;break t}_=void 0}if(_===void 0)break;if(l+=_,4096<l){l=u;break e}if(l===4096||u===this.i.length-1){l=u+1;break e}}l=1e3}else l=1e3;l=Oo(this,T,l),u=ze(this.I),Y(u,"RID",i),Y(u,"CVER",22),this.D&&Y(u,"X-HTTP-Session-Id",this.D),an(this,u),I&&(this.O?l="headers="+encodeURIComponent(String(bo(I)))+"&"+l:this.m&&cs(u,this.m,I)),ls(this.h,T),this.Ua&&Y(u,"TYPE","init"),this.P?(Y(u,"$req",l),Y(u,"SID","null"),T.T=!0,ss(T,u,null)):ss(T,u,l),this.G=2}}else this.G==3&&(i?No(this,i):this.i.length==0||fo(this.h)||No(this))};function No(i,l){var u;l?u=l.l:u=i.U++;const _=ze(i.I);Y(_,"SID",i.K),Y(_,"RID",u),Y(_,"AID",i.T),an(i,_),i.m&&i.o&&cs(_,i.m,i.o),u=new Xe(i,i.j,u,i.B+1),i.m===null&&(u.H=i.o),l&&(i.i=l.D.concat(i.i)),l=Oo(i,u,1e3),u.I=Math.round(.5*i.wa)+Math.round(.5*i.wa*Math.random()),ls(i.h,u),ss(u,_,l)}function an(i,l){i.H&&oe(i.H,function(u,_){Y(l,_,u)}),i.l&&yo({},function(u,_){Y(l,_,u)})}function Oo(i,l,u){u=Math.min(i.i.length,u);var _=i.l?A(i.l.Na,i.l,i):null;e:{var T=i.i;let I=-1;for(;;){const P=["count="+u];I==-1?0<u?(I=T[0].g,P.push("ofs="+I)):I=0:P.push("ofs="+I);let W=!0;for(let ae=0;ae<u;ae++){let j=T[ae].g;const fe=T[ae].map;if(j-=I,0>j)I=Math.max(0,T[ae].g-100),W=!1;else try{Ku(fe,P,"req"+j+"_")}catch{_&&_(fe)}}if(W){_=P.join("&");break e}}}return i=i.i.splice(0,u),l.D=i,_}function Mo(i){if(!i.g&&!i.u){i.Y=1;var l=i.Fa;Gt||Gi(),Kt||(Gt(),Kt=!0),$r.add(l,i),i.v=0}}function hs(i){return i.g||i.u||3<=i.v?!1:(i.Y++,i.u=Xt(A(i.Fa,i),Lo(i,i.v)),i.v++,!0)}n.Fa=function(){if(this.u=null,xo(this),this.ba&&!(this.M||this.g==null||0>=this.R)){var i=2*this.R;this.j.info("BP detection timer enabled: "+i),this.A=Xt(A(this.ab,this),i)}},n.ab=function(){this.A&&(this.A=null,this.j.info("BP detection timeout reached."),this.j.info("Buffering proxy detected and switch to long-polling!"),this.F=!1,this.M=!0,Ee(10),Xn(this),xo(this))};function ds(i){i.A!=null&&(c.clearTimeout(i.A),i.A=null)}function xo(i){i.g=new Xe(i,i.j,"rpc",i.Y),i.m===null&&(i.g.H=i.o),i.g.O=0;var l=ze(i.qa);Y(l,"RID","rpc"),Y(l,"SID",i.K),Y(l,"AID",i.T),Y(l,"CI",i.F?"0":"1"),!i.F&&i.ja&&Y(l,"TO",i.ja),Y(l,"TYPE","xmlhttp"),an(i,l),i.m&&i.o&&cs(l,i.m,i.o),i.L&&(i.g.I=i.L);var u=i.g;i=i.ia,u.L=1,u.v=Hn(ze(l)),u.m=null,u.P=!0,co(u,i)}n.Za=function(){this.C!=null&&(this.C=null,Xn(this),hs(this),Ee(19))};function Zn(i){i.C!=null&&(c.clearTimeout(i.C),i.C=null)}function Fo(i,l){var u=null;if(i.g==l){Zn(i),ds(i),i.g=null;var _=2}else if(as(i.h,l))u=l.D,go(i.h,l),_=1;else return;if(i.G!=0){if(l.o)if(_==1){u=l.m?l.m.length:0,l=Date.now()-l.F;var T=i.B;_=zn(),ve(_,new io(_,u)),Jn(i)}else Mo(i);else if(T=l.s,T==3||T==0&&0<l.X||!(_==1&&Yu(i,l)||_==2&&hs(i)))switch(u&&0<u.length&&(l=i.h,l.i=l.i.concat(u)),T){case 1:_t(i,5);break;case 4:_t(i,10);break;case 3:_t(i,6);break;default:_t(i,2)}}}function Lo(i,l){let u=i.Ta+Math.floor(Math.random()*i.cb);return i.isActive()||(u*=2),u*l}function _t(i,l){if(i.j.info("Error code "+l),l==2){var u=A(i.fb,i),_=i.Xa;const T=!_;_=new dt(_||"//www.google.com/images/cleardot.gif"),c.location&&c.location.protocol=="http"||Gn(_,"https"),Hn(_),T?qu(_.toString(),u):$u(_.toString(),u)}else Ee(2);i.G=0,i.l&&i.l.sa(l),Uo(i),Bo(i)}n.fb=function(i){i?(this.j.info("Successfully pinged google.com"),Ee(2)):(this.j.info("Failed to ping google.com"),Ee(1))};function Uo(i){if(i.G=0,i.ka=[],i.l){const l=po(i.h);(l.length!=0||i.i.length!=0)&&(D(i.ka,l),D(i.ka,i.i),i.h.i.length=0,N(i.i),i.i.length=0),i.l.ra()}}function zo(i,l,u){var _=u instanceof dt?ze(u):new dt(u);if(_.g!="")l&&(_.g=l+"."+_.g),Kn(_,_.s);else{var T=c.location;_=T.protocol,l=l?l+"."+T.hostname:T.hostname,T=+T.port;var I=new dt(null);_&&Gn(I,_),l&&(I.g=l),T&&Kn(I,T),u&&(I.l=u),_=I}return u=i.D,l=i.ya,u&&l&&Y(_,u,l),Y(_,"VER",i.la),an(i,_),_}function jo(i,l,u){if(l&&!i.J)throw Error("Can't create secondary domain capable XhrIo object.");return l=i.Ca&&!i.pa?new Z(new Wn({eb:u})):new Z(i.pa),l.Ha(i.J),l}n.isActive=function(){return!!this.l&&this.l.isActive(this)};function qo(){}n=qo.prototype,n.ua=function(){},n.ta=function(){},n.sa=function(){},n.ra=function(){},n.isActive=function(){return!0},n.Na=function(){};function er(){}er.prototype.g=function(i,l){return new Ae(i,l)};function Ae(i,l){_e.call(this),this.g=new Vo(l),this.l=i,this.h=l&&l.messageUrlParams||null,i=l&&l.messageHeaders||null,l&&l.clientProtocolHeaderRequired&&(i?i["X-Client-Protocol"]="webchannel":i={"X-Client-Protocol":"webchannel"}),this.g.o=i,i=l&&l.initMessageHeaders||null,l&&l.messageContentType&&(i?i["X-WebChannel-Content-Type"]=l.messageContentType:i={"X-WebChannel-Content-Type":l.messageContentType}),l&&l.va&&(i?i["X-WebChannel-Client-Profile"]=l.va:i={"X-WebChannel-Client-Profile":l.va}),this.g.S=i,(i=l&&l.Sb)&&!H(i)&&(this.g.m=i),this.v=l&&l.supportsCrossDomainXhr||!1,this.u=l&&l.sendRawJson||!1,(l=l&&l.httpSessionIdParam)&&!H(l)&&(this.g.D=l,i=this.h,i!==null&&l in i&&(i=this.h,l in i&&delete i[l])),this.j=new St(this)}k(Ae,_e),Ae.prototype.m=function(){this.g.l=this.j,this.v&&(this.g.J=!0),this.g.connect(this.l,this.h||void 0)},Ae.prototype.close=function(){us(this.g)},Ae.prototype.o=function(i){var l=this.g;if(typeof i=="string"){var u={};u.__data__=i,i=u}else this.u&&(u={},u.__data__=Jr(i),i=u);l.i.push(new Bu(l.Ya++,i)),l.G==3&&Jn(l)},Ae.prototype.N=function(){this.g.l=null,delete this.j,us(this.g),delete this.g,Ae.aa.N.call(this)};function $o(i){es.call(this),i.__headers__&&(this.headers=i.__headers__,this.statusCode=i.__status__,delete i.__headers__,delete i.__status__);var l=i.__sm__;if(l){e:{for(const u in l){i=u;break e}i=void 0}(this.i=i)&&(i=this.i,l=l!==null&&i in l?l[i]:void 0),this.data=l}else this.data=i}k($o,es);function Go(){ts.call(this),this.status=1}k(Go,ts);function St(i){this.g=i}k(St,qo),St.prototype.ua=function(){ve(this.g,"a")},St.prototype.ta=function(i){ve(this.g,new $o(i))},St.prototype.sa=function(i){ve(this.g,new Go)},St.prototype.ra=function(){ve(this.g,"b")},er.prototype.createWebChannel=er.prototype.g,Ae.prototype.send=Ae.prototype.o,Ae.prototype.open=Ae.prototype.m,Ae.prototype.close=Ae.prototype.close,jl=function(){return new er},zl=function(){return zn()},Ul=ut,xs={mb:0,pb:1,qb:2,Jb:3,Ob:4,Lb:5,Mb:6,Kb:7,Ib:8,Nb:9,PROXY:10,NOPROXY:11,Gb:12,Cb:13,Db:14,Bb:15,Eb:16,Fb:17,ib:18,hb:19,jb:20},jn.NO_ERROR=0,jn.TIMEOUT=8,jn.HTTP_ERROR=6,ar=jn,oo.COMPLETE="complete",Ll=oo,to.EventType=Qt,Qt.OPEN="a",Qt.CLOSE="b",Qt.ERROR="c",Qt.MESSAGE="d",_e.prototype.listen=_e.prototype.K,un=to,Z.prototype.listenOnce=Z.prototype.L,Z.prototype.getLastError=Z.prototype.Ka,Z.prototype.getLastErrorCode=Z.prototype.Ba,Z.prototype.getStatus=Z.prototype.Z,Z.prototype.getResponseJson=Z.prototype.Oa,Z.prototype.getResponseText=Z.prototype.oa,Z.prototype.send=Z.prototype.ea,Z.prototype.setWithCredentials=Z.prototype.Ha,Fl=Z}).apply(typeof nr<"u"?nr:typeof self<"u"?self:typeof window<"u"?window:{});const ma="@firebase/firestore";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pe{constructor(e){this.uid=e}isAuthenticated(){return this.uid!=null}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}pe.UNAUTHENTICATED=new pe(null),pe.GOOGLE_CREDENTIALS=new pe("google-credentials-uid"),pe.FIRST_PARTY=new pe("first-party-uid"),pe.MOCK_USER=new pe("mock-user");/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let zt="10.14.0";/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Et=new ti("@firebase/firestore");function cn(){return Et.logLevel}function V(n,...e){if(Et.logLevel<=z.DEBUG){const t=e.map(ci);Et.debug(`Firestore (${zt}): ${n}`,...t)}}function He(n,...e){if(Et.logLevel<=z.ERROR){const t=e.map(ci);Et.error(`Firestore (${zt}): ${n}`,...t)}}function Nt(n,...e){if(Et.logLevel<=z.WARN){const t=e.map(ci);Et.warn(`Firestore (${zt}): ${n}`,...t)}}function ci(n){if(typeof n=="string")return n;try{/**
* @license
* Copyright 2020 Google LLC
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
*/return(function(t){return JSON.stringify(t)})(n)}catch{return n}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function M(n="Unexpected state"){const e=`FIRESTORE (${zt}) INTERNAL ASSERTION FAILED: `+n;throw He(e),new Error(e)}function G(n,e){n||M()}function F(n,e){return n}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const S={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class B extends lt{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qe{constructor(){this.promise=new Promise(((e,t)=>{this.resolve=e,this.reject=t}))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ql{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization",`Bearer ${e}`)}}class uf{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable((()=>t(pe.UNAUTHENTICATED)))}shutdown(){}}class hf{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable((()=>t(this.token.user)))}shutdown(){this.changeListener=null}}class df{constructor(e){this.t=e,this.currentUser=pe.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){G(this.o===void 0);let r=this.i;const s=h=>this.i!==r?(r=this.i,t(h)):Promise.resolve();let o=new qe;this.o=()=>{this.i++,this.currentUser=this.u(),o.resolve(),o=new qe,e.enqueueRetryable((()=>s(this.currentUser)))};const a=()=>{const h=o;e.enqueueRetryable((async()=>{await h.promise,await s(this.currentUser)}))},c=h=>{V("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=h,this.o&&(this.auth.addAuthTokenListener(this.o),a())};this.t.onInit((h=>c(h))),setTimeout((()=>{if(!this.auth){const h=this.t.getImmediate({optional:!0});h?c(h):(V("FirebaseAuthCredentialsProvider","Auth not yet detected"),o.resolve(),o=new qe)}}),0),a()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then((r=>this.i!==e?(V("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):r?(G(typeof r.accessToken=="string"),new ql(r.accessToken,this.currentUser)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.o&&this.auth.removeAuthTokenListener(this.o),this.o=void 0}u(){const e=this.auth&&this.auth.getUid();return G(e===null||typeof e=="string"),new pe(e)}}class _f{constructor(e,t,r){this.l=e,this.h=t,this.P=r,this.type="FirstParty",this.user=pe.FIRST_PARTY,this.I=new Map}T(){return this.P?this.P():null}get headers(){this.I.set("X-Goog-AuthUser",this.l);const e=this.T();return e&&this.I.set("Authorization",e),this.h&&this.I.set("X-Goog-Iam-Authorization-Token",this.h),this.I}}class ff{constructor(e,t,r){this.l=e,this.h=t,this.P=r}getToken(){return Promise.resolve(new _f(this.l,this.h,this.P))}start(e,t){e.enqueueRetryable((()=>t(pe.FIRST_PARTY)))}shutdown(){}invalidateToken(){}}class mf{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class gf{constructor(e){this.A=e,this.forceRefresh=!1,this.appCheck=null,this.R=null}start(e,t){G(this.o===void 0);const r=o=>{o.error!=null&&V("FirebaseAppCheckTokenProvider",`Error getting App Check token; using placeholder token instead. Error: ${o.error.message}`);const a=o.token!==this.R;return this.R=o.token,V("FirebaseAppCheckTokenProvider",`Received ${a?"new":"existing"} token.`),a?t(o.token):Promise.resolve()};this.o=o=>{e.enqueueRetryable((()=>r(o)))};const s=o=>{V("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=o,this.o&&this.appCheck.addTokenListener(this.o)};this.A.onInit((o=>s(o))),setTimeout((()=>{if(!this.appCheck){const o=this.A.getImmediate({optional:!0});o?s(o):V("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}}),0)}getToken(){const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then((t=>t?(G(typeof t.token=="string"),this.R=t.token,new mf(t.token)):null)):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.o&&this.appCheck.removeTokenListener(this.o),this.o=void 0}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pf(n){const e=typeof self<"u"&&(self.crypto||self.msCrypto),t=new Uint8Array(n);if(e&&typeof e.getRandomValues=="function")e.getRandomValues(t);else for(let r=0;r<n;r++)t[r]=Math.floor(256*Math.random());return t}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $l{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=Math.floor(256/e.length)*e.length;let r="";for(;r.length<20;){const s=pf(40);for(let o=0;o<s.length;++o)r.length<20&&s[o]<t&&(r+=e.charAt(s[o]%e.length))}return r}}function q(n,e){return n<e?-1:n>e?1:0}function Ot(n,e,t){return n.length===e.length&&n.every(((r,s)=>t(r,e[s])))}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ${constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new B(S.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new B(S.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<-62135596800)throw new B(S.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new B(S.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}static now(){return $.fromMillis(Date.now())}static fromDate(e){return $.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),r=Math.floor(1e6*(e-1e3*t));return new $(t,r)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/1e6}_compareTo(e){return this.seconds===e.seconds?q(this.nanoseconds,e.nanoseconds):q(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{seconds:this.seconds,nanoseconds:this.nanoseconds}}valueOf(){const e=this.seconds- -62135596800;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class x{constructor(e){this.timestamp=e}static fromTimestamp(e){return new x(e)}static min(){return new x(new $(0,0))}static max(){return new x(new $(253402300799,999999999))}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tn{constructor(e,t,r){t===void 0?t=0:t>e.length&&M(),r===void 0?r=e.length-t:r>e.length-t&&M(),this.segments=e,this.offset=t,this.len=r}get length(){return this.len}isEqual(e){return Tn.comparator(this,e)===0}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof Tn?e.forEach((r=>{t.push(r)})):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=e===void 0?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return this.length===0}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,r=this.limit();t<r;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const r=Math.min(e.length,t.length);for(let s=0;s<r;s++){const o=e.get(s),a=t.get(s);if(o<a)return-1;if(o>a)return 1}return e.length<t.length?-1:e.length>t.length?1:0}}class X extends Tn{construct(e,t,r){return new X(e,t,r)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const r of e){if(r.indexOf("//")>=0)throw new B(S.INVALID_ARGUMENT,`Invalid segment (${r}). Paths must not contain // in them.`);t.push(...r.split("/").filter((s=>s.length>0)))}return new X(t)}static emptyPath(){return new X([])}}const yf=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class ce extends Tn{construct(e,t,r){return new ce(e,t,r)}static isValidIdentifier(e){return yf.test(e)}canonicalString(){return this.toArray().map((e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),ce.isValidIdentifier(e)||(e="`"+e+"`"),e))).join(".")}toString(){return this.canonicalString()}isKeyField(){return this.length===1&&this.get(0)==="__name__"}static keyField(){return new ce(["__name__"])}static fromServerFormat(e){const t=[];let r="",s=0;const o=()=>{if(r.length===0)throw new B(S.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(r),r=""};let a=!1;for(;s<e.length;){const c=e[s];if(c==="\\"){if(s+1===e.length)throw new B(S.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const h=e[s+1];if(h!=="\\"&&h!=="."&&h!=="`")throw new B(S.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);r+=h,s+=2}else c==="`"?(a=!a,s++):c!=="."||a?(r+=c,s++):(o(),s++)}if(o(),a)throw new B(S.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new ce(t)}static emptyPath(){return new ce([])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class O{constructor(e){this.path=e}static fromPath(e){return new O(X.fromString(e))}static fromName(e){return new O(X.fromString(e).popFirst(5))}static empty(){return new O(X.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return e!==null&&X.comparator(this.path,e.path)===0}toString(){return this.path.toString()}static comparator(e,t){return X.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new O(new X(e.slice()))}}function vf(n,e){const t=n.toTimestamp().seconds,r=n.toTimestamp().nanoseconds+1,s=x.fromTimestamp(r===1e9?new $(t+1,0):new $(t,r));return new it(s,O.empty(),e)}function Ef(n){return new it(n.readTime,n.key,-1)}class it{constructor(e,t,r){this.readTime=e,this.documentKey=t,this.largestBatchId=r}static min(){return new it(x.min(),O.empty(),-1)}static max(){return new it(x.max(),O.empty(),-1)}}function Tf(n,e){let t=n.readTime.compareTo(e.readTime);return t!==0?t:(t=O.comparator(n.documentKey,e.documentKey),t!==0?t:q(n.largestBatchId,e.largestBatchId))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Rf="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class wf{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach((e=>e()))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function Dn(n){if(n.code!==S.FAILED_PRECONDITION||n.message!==Rf)throw n;V("LocalStore","Unexpectedly lost primary lease")}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class C{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e((t=>{this.isDone=!0,this.result=t,this.nextCallback&&this.nextCallback(t)}),(t=>{this.isDone=!0,this.error=t,this.catchCallback&&this.catchCallback(t)}))}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&M(),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new C(((r,s)=>{this.nextCallback=o=>{this.wrapSuccess(e,o).next(r,s)},this.catchCallback=o=>{this.wrapFailure(t,o).next(r,s)}}))}toPromise(){return new Promise(((e,t)=>{this.next(e,t)}))}wrapUserFunction(e){try{const t=e();return t instanceof C?t:C.resolve(t)}catch(t){return C.reject(t)}}wrapSuccess(e,t){return e?this.wrapUserFunction((()=>e(t))):C.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction((()=>e(t))):C.reject(t)}static resolve(e){return new C(((t,r)=>{t(e)}))}static reject(e){return new C(((t,r)=>{r(e)}))}static waitFor(e){return new C(((t,r)=>{let s=0,o=0,a=!1;e.forEach((c=>{++s,c.next((()=>{++o,a&&o===s&&t()}),(h=>r(h)))})),a=!0,o===s&&t()}))}static or(e){let t=C.resolve(!1);for(const r of e)t=t.next((s=>s?C.resolve(s):r()));return t}static forEach(e,t){const r=[];return e.forEach(((s,o)=>{r.push(t.call(this,s,o))})),this.waitFor(r)}static mapArray(e,t){return new C(((r,s)=>{const o=e.length,a=new Array(o);let c=0;for(let h=0;h<o;h++){const d=h;t(e[d]).next((m=>{a[d]=m,++c,c===o&&r(a)}),(m=>s(m)))}}))}static doWhile(e,t){return new C(((r,s)=>{const o=()=>{e()===!0?t().next((()=>{o()}),s):r()};o()}))}}function Af(n){const e=n.match(/Android ([\d.]+)/i),t=e?e[1].split(".").slice(0,2).join("."):"-1";return Number(t)}function kn(n){return n.name==="IndexedDbTransactionError"}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ui{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=r=>this.ie(r),this.se=r=>t.writeSequenceNumber(r))}ie(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.se&&this.se(e),e}}ui.oe=-1;function Sr(n){return n==null}function mr(n){return n===0&&1/n==-1/0}function If(n){return typeof n=="number"&&Number.isInteger(n)&&!mr(n)&&n<=Number.MAX_SAFE_INTEGER&&n>=Number.MIN_SAFE_INTEGER}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ga(n){let e=0;for(const t in n)Object.prototype.hasOwnProperty.call(n,t)&&e++;return e}function wt(n,e){for(const t in n)Object.prototype.hasOwnProperty.call(n,t)&&e(t,n[t])}function Gl(n){for(const e in n)if(Object.prototype.hasOwnProperty.call(n,e))return!1;return!0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class J{constructor(e,t){this.comparator=e,this.root=t||le.EMPTY}insert(e,t){return new J(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,le.BLACK,null,null))}remove(e){return new J(this.comparator,this.root.remove(e,this.comparator).copy(null,null,le.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const r=this.comparator(e,t.key);if(r===0)return t.value;r<0?t=t.left:r>0&&(t=t.right)}return null}indexOf(e){let t=0,r=this.root;for(;!r.isEmpty();){const s=this.comparator(e,r.key);if(s===0)return t+r.left.size;s<0?r=r.left:(t+=r.left.size+1,r=r.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal(((t,r)=>(e(t,r),!1)))}toString(){const e=[];return this.inorderTraversal(((t,r)=>(e.push(`${t}:${r}`),!1))),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new rr(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new rr(this.root,e,this.comparator,!1)}getReverseIterator(){return new rr(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new rr(this.root,e,this.comparator,!0)}}class rr{constructor(e,t,r,s){this.isReverse=s,this.nodeStack=[];let o=1;for(;!e.isEmpty();)if(o=t?r(e.key,t):1,t&&s&&(o*=-1),o<0)e=this.isReverse?e.left:e.right;else{if(o===0){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(this.nodeStack.length===0)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class le{constructor(e,t,r,s,o){this.key=e,this.value=t,this.color=r??le.RED,this.left=s??le.EMPTY,this.right=o??le.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,r,s,o){return new le(e??this.key,t??this.value,r??this.color,s??this.left,o??this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,r){let s=this;const o=r(e,s.key);return s=o<0?s.copy(null,null,null,s.left.insert(e,t,r),null):o===0?s.copy(null,t,null,null,null):s.copy(null,null,null,null,s.right.insert(e,t,r)),s.fixUp()}removeMin(){if(this.left.isEmpty())return le.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let r,s=this;if(t(e,s.key)<0)s.left.isEmpty()||s.left.isRed()||s.left.left.isRed()||(s=s.moveRedLeft()),s=s.copy(null,null,null,s.left.remove(e,t),null);else{if(s.left.isRed()&&(s=s.rotateRight()),s.right.isEmpty()||s.right.isRed()||s.right.left.isRed()||(s=s.moveRedRight()),t(e,s.key)===0){if(s.right.isEmpty())return le.EMPTY;r=s.right.min(),s=s.copy(r.key,r.value,null,null,s.right.removeMin())}s=s.copy(null,null,null,null,s.right.remove(e,t))}return s.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,le.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,le.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed()||this.right.isRed())throw M();const e=this.left.check();if(e!==this.right.check())throw M();return e+(this.isRed()?0:1)}}le.EMPTY=null,le.RED=!0,le.BLACK=!1;le.EMPTY=new class{constructor(){this.size=0}get key(){throw M()}get value(){throw M()}get color(){throw M()}get left(){throw M()}get right(){throw M()}copy(e,t,r,s,o){return this}insert(e,t,r){return new le(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ue{constructor(e){this.comparator=e,this.data=new J(this.comparator)}has(e){return this.data.get(e)!==null}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal(((t,r)=>(e(t),!1)))}forEachInRange(e,t){const r=this.data.getIteratorFrom(e[0]);for(;r.hasNext();){const s=r.getNext();if(this.comparator(s.key,e[1])>=0)return;t(s.key)}}forEachWhile(e,t){let r;for(r=t!==void 0?this.data.getIteratorFrom(t):this.data.getIterator();r.hasNext();)if(!e(r.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new pa(this.data.getIterator())}getIteratorFrom(e){return new pa(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach((r=>{t=t.add(r)})),t}isEqual(e){if(!(e instanceof ue)||this.size!==e.size)return!1;const t=this.data.getIterator(),r=e.data.getIterator();for(;t.hasNext();){const s=t.getNext().key,o=r.getNext().key;if(this.comparator(s,o)!==0)return!1}return!0}toArray(){const e=[];return this.forEach((t=>{e.push(t)})),e}toString(){const e=[];return this.forEach((t=>e.push(t))),"SortedSet("+e.toString()+")"}copy(e){const t=new ue(this.comparator);return t.data=e,t}}class pa{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ie{constructor(e){this.fields=e,e.sort(ce.comparator)}static empty(){return new Ie([])}unionWith(e){let t=new ue(ce.comparator);for(const r of this.fields)t=t.add(r);for(const r of e)t=t.add(r);return new Ie(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return Ot(this.fields,e.fields,((t,r)=>t.isEqual(r)))}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kl extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class he{constructor(e){this.binaryString=e}static fromBase64String(e){const t=(function(s){try{return atob(s)}catch(o){throw typeof DOMException<"u"&&o instanceof DOMException?new Kl("Invalid base64 string: "+o):o}})(e);return new he(t)}static fromUint8Array(e){const t=(function(s){let o="";for(let a=0;a<s.length;++a)o+=String.fromCharCode(s[a]);return o})(e);return new he(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return(function(t){return btoa(t)})(this.binaryString)}toUint8Array(){return(function(t){const r=new Uint8Array(t.length);for(let s=0;s<t.length;s++)r[s]=t.charCodeAt(s);return r})(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return q(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}he.EMPTY_BYTE_STRING=new he("");const bf=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function ot(n){if(G(!!n),typeof n=="string"){let e=0;const t=bf.exec(n);if(G(!!t),t[1]){let s=t[1];s=(s+"000000000").substr(0,9),e=Number(s)}const r=new Date(n);return{seconds:Math.floor(r.getTime()/1e3),nanos:e}}return{seconds:ee(n.seconds),nanos:ee(n.nanos)}}function ee(n){return typeof n=="number"?n:typeof n=="string"?Number(n):0}function Tt(n){return typeof n=="string"?he.fromBase64String(n):he.fromUint8Array(n)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hi(n){var e,t;return((t=(((e=n==null?void 0:n.mapValue)===null||e===void 0?void 0:e.fields)||{}).__type__)===null||t===void 0?void 0:t.stringValue)==="server_timestamp"}function di(n){const e=n.mapValue.fields.__previous_value__;return hi(e)?di(e):e}function Rn(n){const e=ot(n.mapValue.fields.__local_write_time__.timestampValue);return new $(e.seconds,e.nanos)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sf{constructor(e,t,r,s,o,a,c,h,d){this.databaseId=e,this.appId=t,this.persistenceKey=r,this.host=s,this.ssl=o,this.forceLongPolling=a,this.autoDetectLongPolling=c,this.longPollingOptions=h,this.useFetchStreams=d}}class wn{constructor(e,t){this.projectId=e,this.database=t||"(default)"}static empty(){return new wn("","")}get isDefaultDatabase(){return this.database==="(default)"}isEqual(e){return e instanceof wn&&e.projectId===this.projectId&&e.database===this.database}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const sr={mapValue:{}};function Rt(n){return"nullValue"in n?0:"booleanValue"in n?1:"integerValue"in n||"doubleValue"in n?2:"timestampValue"in n?3:"stringValue"in n?5:"bytesValue"in n?6:"referenceValue"in n?7:"geoPointValue"in n?8:"arrayValue"in n?9:"mapValue"in n?hi(n)?4:Pf(n)?9007199254740991:Cf(n)?10:11:M()}function Me(n,e){if(n===e)return!0;const t=Rt(n);if(t!==Rt(e))return!1;switch(t){case 0:case 9007199254740991:return!0;case 1:return n.booleanValue===e.booleanValue;case 4:return Rn(n).isEqual(Rn(e));case 3:return(function(s,o){if(typeof s.timestampValue=="string"&&typeof o.timestampValue=="string"&&s.timestampValue.length===o.timestampValue.length)return s.timestampValue===o.timestampValue;const a=ot(s.timestampValue),c=ot(o.timestampValue);return a.seconds===c.seconds&&a.nanos===c.nanos})(n,e);case 5:return n.stringValue===e.stringValue;case 6:return(function(s,o){return Tt(s.bytesValue).isEqual(Tt(o.bytesValue))})(n,e);case 7:return n.referenceValue===e.referenceValue;case 8:return(function(s,o){return ee(s.geoPointValue.latitude)===ee(o.geoPointValue.latitude)&&ee(s.geoPointValue.longitude)===ee(o.geoPointValue.longitude)})(n,e);case 2:return(function(s,o){if("integerValue"in s&&"integerValue"in o)return ee(s.integerValue)===ee(o.integerValue);if("doubleValue"in s&&"doubleValue"in o){const a=ee(s.doubleValue),c=ee(o.doubleValue);return a===c?mr(a)===mr(c):isNaN(a)&&isNaN(c)}return!1})(n,e);case 9:return Ot(n.arrayValue.values||[],e.arrayValue.values||[],Me);case 10:case 11:return(function(s,o){const a=s.mapValue.fields||{},c=o.mapValue.fields||{};if(ga(a)!==ga(c))return!1;for(const h in a)if(a.hasOwnProperty(h)&&(c[h]===void 0||!Me(a[h],c[h])))return!1;return!0})(n,e);default:return M()}}function An(n,e){return(n.values||[]).find((t=>Me(t,e)))!==void 0}function Mt(n,e){if(n===e)return 0;const t=Rt(n),r=Rt(e);if(t!==r)return q(t,r);switch(t){case 0:case 9007199254740991:return 0;case 1:return q(n.booleanValue,e.booleanValue);case 2:return(function(o,a){const c=ee(o.integerValue||o.doubleValue),h=ee(a.integerValue||a.doubleValue);return c<h?-1:c>h?1:c===h?0:isNaN(c)?isNaN(h)?0:-1:1})(n,e);case 3:return ya(n.timestampValue,e.timestampValue);case 4:return ya(Rn(n),Rn(e));case 5:return q(n.stringValue,e.stringValue);case 6:return(function(o,a){const c=Tt(o),h=Tt(a);return c.compareTo(h)})(n.bytesValue,e.bytesValue);case 7:return(function(o,a){const c=o.split("/"),h=a.split("/");for(let d=0;d<c.length&&d<h.length;d++){const m=q(c[d],h[d]);if(m!==0)return m}return q(c.length,h.length)})(n.referenceValue,e.referenceValue);case 8:return(function(o,a){const c=q(ee(o.latitude),ee(a.latitude));return c!==0?c:q(ee(o.longitude),ee(a.longitude))})(n.geoPointValue,e.geoPointValue);case 9:return va(n.arrayValue,e.arrayValue);case 10:return(function(o,a){var c,h,d,m;const w=o.fields||{},A=a.fields||{},b=(c=w.value)===null||c===void 0?void 0:c.arrayValue,k=(h=A.value)===null||h===void 0?void 0:h.arrayValue,N=q(((d=b==null?void 0:b.values)===null||d===void 0?void 0:d.length)||0,((m=k==null?void 0:k.values)===null||m===void 0?void 0:m.length)||0);return N!==0?N:va(b,k)})(n.mapValue,e.mapValue);case 11:return(function(o,a){if(o===sr.mapValue&&a===sr.mapValue)return 0;if(o===sr.mapValue)return 1;if(a===sr.mapValue)return-1;const c=o.fields||{},h=Object.keys(c),d=a.fields||{},m=Object.keys(d);h.sort(),m.sort();for(let w=0;w<h.length&&w<m.length;++w){const A=q(h[w],m[w]);if(A!==0)return A;const b=Mt(c[h[w]],d[m[w]]);if(b!==0)return b}return q(h.length,m.length)})(n.mapValue,e.mapValue);default:throw M()}}function ya(n,e){if(typeof n=="string"&&typeof e=="string"&&n.length===e.length)return q(n,e);const t=ot(n),r=ot(e),s=q(t.seconds,r.seconds);return s!==0?s:q(t.nanos,r.nanos)}function va(n,e){const t=n.values||[],r=e.values||[];for(let s=0;s<t.length&&s<r.length;++s){const o=Mt(t[s],r[s]);if(o)return o}return q(t.length,r.length)}function xt(n){return Fs(n)}function Fs(n){return"nullValue"in n?"null":"booleanValue"in n?""+n.booleanValue:"integerValue"in n?""+n.integerValue:"doubleValue"in n?""+n.doubleValue:"timestampValue"in n?(function(t){const r=ot(t);return`time(${r.seconds},${r.nanos})`})(n.timestampValue):"stringValue"in n?n.stringValue:"bytesValue"in n?(function(t){return Tt(t).toBase64()})(n.bytesValue):"referenceValue"in n?(function(t){return O.fromName(t).toString()})(n.referenceValue):"geoPointValue"in n?(function(t){return`geo(${t.latitude},${t.longitude})`})(n.geoPointValue):"arrayValue"in n?(function(t){let r="[",s=!0;for(const o of t.values||[])s?s=!1:r+=",",r+=Fs(o);return r+"]"})(n.arrayValue):"mapValue"in n?(function(t){const r=Object.keys(t.fields||{}).sort();let s="{",o=!0;for(const a of r)o?o=!1:s+=",",s+=`${a}:${Fs(t.fields[a])}`;return s+"}"})(n.mapValue):M()}function Ls(n){return!!n&&"integerValue"in n}function _i(n){return!!n&&"arrayValue"in n}function Ea(n){return!!n&&"nullValue"in n}function Ta(n){return!!n&&"doubleValue"in n&&isNaN(Number(n.doubleValue))}function lr(n){return!!n&&"mapValue"in n}function Cf(n){var e,t;return((t=(((e=n==null?void 0:n.mapValue)===null||e===void 0?void 0:e.fields)||{}).__type__)===null||t===void 0?void 0:t.stringValue)==="__vector__"}function mn(n){if(n.geoPointValue)return{geoPointValue:Object.assign({},n.geoPointValue)};if(n.timestampValue&&typeof n.timestampValue=="object")return{timestampValue:Object.assign({},n.timestampValue)};if(n.mapValue){const e={mapValue:{fields:{}}};return wt(n.mapValue.fields,((t,r)=>e.mapValue.fields[t]=mn(r))),e}if(n.arrayValue){const e={arrayValue:{values:[]}};for(let t=0;t<(n.arrayValue.values||[]).length;++t)e.arrayValue.values[t]=mn(n.arrayValue.values[t]);return e}return Object.assign({},n)}function Pf(n){return(((n.mapValue||{}).fields||{}).__type__||{}).stringValue==="__max__"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Te{constructor(e){this.value=e}static empty(){return new Te({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let r=0;r<e.length-1;++r)if(t=(t.mapValue.fields||{})[e.get(r)],!lr(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=mn(t)}setAll(e){let t=ce.emptyPath(),r={},s=[];e.forEach(((a,c)=>{if(!t.isImmediateParentOf(c)){const h=this.getFieldsMap(t);this.applyChanges(h,r,s),r={},s=[],t=c.popLast()}a?r[c.lastSegment()]=mn(a):s.push(c.lastSegment())}));const o=this.getFieldsMap(t);this.applyChanges(o,r,s)}delete(e){const t=this.field(e.popLast());lr(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return Me(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let r=0;r<e.length;++r){let s=t.mapValue.fields[e.get(r)];lr(s)&&s.mapValue.fields||(s={mapValue:{fields:{}}},t.mapValue.fields[e.get(r)]=s),t=s}return t.mapValue.fields}applyChanges(e,t,r){wt(t,((s,o)=>e[s]=o));for(const s of r)delete e[s]}clone(){return new Te(mn(this.value))}}function Hl(n){const e=[];return wt(n.fields,((t,r)=>{const s=new ce([t]);if(lr(r)){const o=Hl(r.mapValue).fields;if(o.length===0)e.push(s);else for(const a of o)e.push(s.child(a))}else e.push(s)})),new Ie(e)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ye{constructor(e,t,r,s,o,a,c){this.key=e,this.documentType=t,this.version=r,this.readTime=s,this.createTime=o,this.data=a,this.documentState=c}static newInvalidDocument(e){return new ye(e,0,x.min(),x.min(),x.min(),Te.empty(),0)}static newFoundDocument(e,t,r,s){return new ye(e,1,t,x.min(),r,s,0)}static newNoDocument(e,t){return new ye(e,2,t,x.min(),x.min(),Te.empty(),0)}static newUnknownDocument(e,t){return new ye(e,3,t,x.min(),x.min(),Te.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(x.min())||this.documentType!==2&&this.documentType!==0||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=Te.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=Te.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=x.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return this.documentState===1}get hasCommittedMutations(){return this.documentState===2}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return this.documentType!==0}isFoundDocument(){return this.documentType===1}isNoDocument(){return this.documentType===2}isUnknownDocument(){return this.documentType===3}isEqual(e){return e instanceof ye&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new ye(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gr{constructor(e,t){this.position=e,this.inclusive=t}}function Ra(n,e,t){let r=0;for(let s=0;s<n.position.length;s++){const o=e[s],a=n.position[s];if(o.field.isKeyField()?r=O.comparator(O.fromName(a.referenceValue),t.key):r=Mt(a,t.data.field(o.field)),o.dir==="desc"&&(r*=-1),r!==0)break}return r}function wa(n,e){if(n===null)return e===null;if(e===null||n.inclusive!==e.inclusive||n.position.length!==e.position.length)return!1;for(let t=0;t<n.position.length;t++)if(!Me(n.position[t],e.position[t]))return!1;return!0}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pr{constructor(e,t="asc"){this.field=e,this.dir=t}}function Df(n,e){return n.dir===e.dir&&n.field.isEqual(e.field)}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Wl{}class ne extends Wl{constructor(e,t,r){super(),this.field=e,this.op=t,this.value=r}static create(e,t,r){return e.isKeyField()?t==="in"||t==="not-in"?this.createKeyFieldInFilter(e,t,r):new Vf(e,t,r):t==="array-contains"?new Of(e,r):t==="in"?new Mf(e,r):t==="not-in"?new xf(e,r):t==="array-contains-any"?new Ff(e,r):new ne(e,t,r)}static createKeyFieldInFilter(e,t,r){return t==="in"?new Bf(e,r):new Nf(e,r)}matches(e){const t=e.data.field(this.field);return this.op==="!="?t!==null&&this.matchesComparison(Mt(t,this.value)):t!==null&&Rt(this.value)===Rt(t)&&this.matchesComparison(Mt(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return e===0;case"!=":return e!==0;case">":return e>0;case">=":return e>=0;default:return M()}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class xe extends Wl{constructor(e,t){super(),this.filters=e,this.op=t,this.ae=null}static create(e,t){return new xe(e,t)}matches(e){return Ql(this)?this.filters.find((t=>!t.matches(e)))===void 0:this.filters.find((t=>t.matches(e)))!==void 0}getFlattenedFilters(){return this.ae!==null||(this.ae=this.filters.reduce(((e,t)=>e.concat(t.getFlattenedFilters())),[])),this.ae}getFilters(){return Object.assign([],this.filters)}}function Ql(n){return n.op==="and"}function Yl(n){return kf(n)&&Ql(n)}function kf(n){for(const e of n.filters)if(e instanceof xe)return!1;return!0}function Us(n){if(n instanceof ne)return n.field.canonicalString()+n.op.toString()+xt(n.value);if(Yl(n))return n.filters.map((e=>Us(e))).join(",");{const e=n.filters.map((t=>Us(t))).join(",");return`${n.op}(${e})`}}function Xl(n,e){return n instanceof ne?(function(r,s){return s instanceof ne&&r.op===s.op&&r.field.isEqual(s.field)&&Me(r.value,s.value)})(n,e):n instanceof xe?(function(r,s){return s instanceof xe&&r.op===s.op&&r.filters.length===s.filters.length?r.filters.reduce(((o,a,c)=>o&&Xl(a,s.filters[c])),!0):!1})(n,e):void M()}function Jl(n){return n instanceof ne?(function(t){return`${t.field.canonicalString()} ${t.op} ${xt(t.value)}`})(n):n instanceof xe?(function(t){return t.op.toString()+" {"+t.getFilters().map(Jl).join(" ,")+"}"})(n):"Filter"}class Vf extends ne{constructor(e,t,r){super(e,t,r),this.key=O.fromName(r.referenceValue)}matches(e){const t=O.comparator(e.key,this.key);return this.matchesComparison(t)}}class Bf extends ne{constructor(e,t){super(e,"in",t),this.keys=Zl("in",t)}matches(e){return this.keys.some((t=>t.isEqual(e.key)))}}class Nf extends ne{constructor(e,t){super(e,"not-in",t),this.keys=Zl("not-in",t)}matches(e){return!this.keys.some((t=>t.isEqual(e.key)))}}function Zl(n,e){var t;return(((t=e.arrayValue)===null||t===void 0?void 0:t.values)||[]).map((r=>O.fromName(r.referenceValue)))}class Of extends ne{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return _i(t)&&An(t.arrayValue,this.value)}}class Mf extends ne{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return t!==null&&An(this.value.arrayValue,t)}}class xf extends ne{constructor(e,t){super(e,"not-in",t)}matches(e){if(An(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return t!==null&&!An(this.value.arrayValue,t)}}class Ff extends ne{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!_i(t)||!t.arrayValue.values)&&t.arrayValue.values.some((r=>An(this.value.arrayValue,r)))}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lf{constructor(e,t=null,r=[],s=[],o=null,a=null,c=null){this.path=e,this.collectionGroup=t,this.orderBy=r,this.filters=s,this.limit=o,this.startAt=a,this.endAt=c,this.ue=null}}function Aa(n,e=null,t=[],r=[],s=null,o=null,a=null){return new Lf(n,e,t,r,s,o,a)}function fi(n){const e=F(n);if(e.ue===null){let t=e.path.canonicalString();e.collectionGroup!==null&&(t+="|cg:"+e.collectionGroup),t+="|f:",t+=e.filters.map((r=>Us(r))).join(","),t+="|ob:",t+=e.orderBy.map((r=>(function(o){return o.field.canonicalString()+o.dir})(r))).join(","),Sr(e.limit)||(t+="|l:",t+=e.limit),e.startAt&&(t+="|lb:",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map((r=>xt(r))).join(",")),e.endAt&&(t+="|ub:",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map((r=>xt(r))).join(",")),e.ue=t}return e.ue}function mi(n,e){if(n.limit!==e.limit||n.orderBy.length!==e.orderBy.length)return!1;for(let t=0;t<n.orderBy.length;t++)if(!Df(n.orderBy[t],e.orderBy[t]))return!1;if(n.filters.length!==e.filters.length)return!1;for(let t=0;t<n.filters.length;t++)if(!Xl(n.filters[t],e.filters[t]))return!1;return n.collectionGroup===e.collectionGroup&&!!n.path.isEqual(e.path)&&!!wa(n.startAt,e.startAt)&&wa(n.endAt,e.endAt)}function zs(n){return O.isDocumentKey(n.path)&&n.collectionGroup===null&&n.filters.length===0}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cr{constructor(e,t=null,r=[],s=[],o=null,a="F",c=null,h=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=r,this.filters=s,this.limit=o,this.limitType=a,this.startAt=c,this.endAt=h,this.ce=null,this.le=null,this.he=null,this.startAt,this.endAt}}function Uf(n,e,t,r,s,o,a,c){return new Cr(n,e,t,r,s,o,a,c)}function gi(n){return new Cr(n)}function Ia(n){return n.filters.length===0&&n.limit===null&&n.startAt==null&&n.endAt==null&&(n.explicitOrderBy.length===0||n.explicitOrderBy.length===1&&n.explicitOrderBy[0].field.isKeyField())}function zf(n){return n.collectionGroup!==null}function gn(n){const e=F(n);if(e.ce===null){e.ce=[];const t=new Set;for(const o of e.explicitOrderBy)e.ce.push(o),t.add(o.field.canonicalString());const r=e.explicitOrderBy.length>0?e.explicitOrderBy[e.explicitOrderBy.length-1].dir:"asc";(function(a){let c=new ue(ce.comparator);return a.filters.forEach((h=>{h.getFlattenedFilters().forEach((d=>{d.isInequality()&&(c=c.add(d.field))}))})),c})(e).forEach((o=>{t.has(o.canonicalString())||o.isKeyField()||e.ce.push(new pr(o,r))})),t.has(ce.keyField().canonicalString())||e.ce.push(new pr(ce.keyField(),r))}return e.ce}function Be(n){const e=F(n);return e.le||(e.le=jf(e,gn(n))),e.le}function jf(n,e){if(n.limitType==="F")return Aa(n.path,n.collectionGroup,e,n.filters,n.limit,n.startAt,n.endAt);{e=e.map((s=>{const o=s.dir==="desc"?"asc":"desc";return new pr(s.field,o)}));const t=n.endAt?new gr(n.endAt.position,n.endAt.inclusive):null,r=n.startAt?new gr(n.startAt.position,n.startAt.inclusive):null;return Aa(n.path,n.collectionGroup,e,n.filters,n.limit,t,r)}}function js(n,e,t){return new Cr(n.path,n.collectionGroup,n.explicitOrderBy.slice(),n.filters.slice(),e,t,n.startAt,n.endAt)}function Pr(n,e){return mi(Be(n),Be(e))&&n.limitType===e.limitType}function ec(n){return`${fi(Be(n))}|lt:${n.limitType}`}function Pt(n){return`Query(target=${(function(t){let r=t.path.canonicalString();return t.collectionGroup!==null&&(r+=" collectionGroup="+t.collectionGroup),t.filters.length>0&&(r+=`, filters: [${t.filters.map((s=>Jl(s))).join(", ")}]`),Sr(t.limit)||(r+=", limit: "+t.limit),t.orderBy.length>0&&(r+=`, orderBy: [${t.orderBy.map((s=>(function(a){return`${a.field.canonicalString()} (${a.dir})`})(s))).join(", ")}]`),t.startAt&&(r+=", startAt: ",r+=t.startAt.inclusive?"b:":"a:",r+=t.startAt.position.map((s=>xt(s))).join(",")),t.endAt&&(r+=", endAt: ",r+=t.endAt.inclusive?"a:":"b:",r+=t.endAt.position.map((s=>xt(s))).join(",")),`Target(${r})`})(Be(n))}; limitType=${n.limitType})`}function Dr(n,e){return e.isFoundDocument()&&(function(r,s){const o=s.key.path;return r.collectionGroup!==null?s.key.hasCollectionId(r.collectionGroup)&&r.path.isPrefixOf(o):O.isDocumentKey(r.path)?r.path.isEqual(o):r.path.isImmediateParentOf(o)})(n,e)&&(function(r,s){for(const o of gn(r))if(!o.field.isKeyField()&&s.data.field(o.field)===null)return!1;return!0})(n,e)&&(function(r,s){for(const o of r.filters)if(!o.matches(s))return!1;return!0})(n,e)&&(function(r,s){return!(r.startAt&&!(function(a,c,h){const d=Ra(a,c,h);return a.inclusive?d<=0:d<0})(r.startAt,gn(r),s)||r.endAt&&!(function(a,c,h){const d=Ra(a,c,h);return a.inclusive?d>=0:d>0})(r.endAt,gn(r),s))})(n,e)}function qf(n){return n.collectionGroup||(n.path.length%2==1?n.path.lastSegment():n.path.get(n.path.length-2))}function tc(n){return(e,t)=>{let r=!1;for(const s of gn(n)){const o=$f(s,e,t);if(o!==0)return o;r=r||s.field.isKeyField()}return 0}}function $f(n,e,t){const r=n.field.isKeyField()?O.comparator(e.key,t.key):(function(o,a,c){const h=a.data.field(o),d=c.data.field(o);return h!==null&&d!==null?Mt(h,d):M()})(n.field,e,t);switch(n.dir){case"asc":return r;case"desc":return-1*r;default:return M()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jt{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),r=this.inner[t];if(r!==void 0){for(const[s,o]of r)if(this.equalsFn(s,e))return o}}has(e){return this.get(e)!==void 0}set(e,t){const r=this.mapKeyFn(e),s=this.inner[r];if(s===void 0)return this.inner[r]=[[e,t]],void this.innerSize++;for(let o=0;o<s.length;o++)if(this.equalsFn(s[o][0],e))return void(s[o]=[e,t]);s.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),r=this.inner[t];if(r===void 0)return!1;for(let s=0;s<r.length;s++)if(this.equalsFn(r[s][0],e))return r.length===1?delete this.inner[t]:r.splice(s,1),this.innerSize--,!0;return!1}forEach(e){wt(this.inner,((t,r)=>{for(const[s,o]of r)e(s,o)}))}isEmpty(){return Gl(this.inner)}size(){return this.innerSize}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Gf=new J(O.comparator);function We(){return Gf}const nc=new J(O.comparator);function hn(...n){let e=nc;for(const t of n)e=e.insert(t.key,t);return e}function rc(n){let e=nc;return n.forEach(((t,r)=>e=e.insert(t,r.overlayedDocument))),e}function gt(){return pn()}function sc(){return pn()}function pn(){return new jt((n=>n.toString()),((n,e)=>n.isEqual(e)))}const Kf=new J(O.comparator),Hf=new ue(O.comparator);function L(...n){let e=Hf;for(const t of n)e=e.add(t);return e}const Wf=new ue(q);function Qf(){return Wf}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function pi(n,e){if(n.useProto3Json){if(isNaN(e))return{doubleValue:"NaN"};if(e===1/0)return{doubleValue:"Infinity"};if(e===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:mr(e)?"-0":e}}function ic(n){return{integerValue:""+n}}function oc(n,e){return If(e)?ic(e):pi(n,e)}/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class kr{constructor(){this._=void 0}}function Yf(n,e,t){return n instanceof yr?(function(s,o){const a={fields:{__type__:{stringValue:"server_timestamp"},__local_write_time__:{timestampValue:{seconds:s.seconds,nanos:s.nanoseconds}}}};return o&&hi(o)&&(o=di(o)),o&&(a.fields.__previous_value__=o),{mapValue:a}})(t,e):n instanceof In?lc(n,e):n instanceof bn?cc(n,e):(function(s,o){const a=ac(s,o),c=ba(a)+ba(s.Pe);return Ls(a)&&Ls(s.Pe)?ic(c):pi(s.serializer,c)})(n,e)}function Xf(n,e,t){return n instanceof In?lc(n,e):n instanceof bn?cc(n,e):t}function ac(n,e){return n instanceof Sn?(function(r){return Ls(r)||(function(o){return!!o&&"doubleValue"in o})(r)})(e)?e:{integerValue:0}:null}class yr extends kr{}class In extends kr{constructor(e){super(),this.elements=e}}function lc(n,e){const t=uc(e);for(const r of n.elements)t.some((s=>Me(s,r)))||t.push(r);return{arrayValue:{values:t}}}class bn extends kr{constructor(e){super(),this.elements=e}}function cc(n,e){let t=uc(e);for(const r of n.elements)t=t.filter((s=>!Me(s,r)));return{arrayValue:{values:t}}}class Sn extends kr{constructor(e,t){super(),this.serializer=e,this.Pe=t}}function ba(n){return ee(n.integerValue||n.doubleValue)}function uc(n){return _i(n)&&n.arrayValue.values?n.arrayValue.values.slice():[]}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Jf{constructor(e,t){this.field=e,this.transform=t}}function Zf(n,e){return n.field.isEqual(e.field)&&(function(r,s){return r instanceof In&&s instanceof In||r instanceof bn&&s instanceof bn?Ot(r.elements,s.elements,Me):r instanceof Sn&&s instanceof Sn?Me(r.Pe,s.Pe):r instanceof yr&&s instanceof yr})(n.transform,e.transform)}class em{constructor(e,t){this.version=e,this.transformResults=t}}class Ne{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new Ne}static exists(e){return new Ne(void 0,e)}static updateTime(e){return new Ne(e)}get isNone(){return this.updateTime===void 0&&this.exists===void 0}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function cr(n,e){return n.updateTime!==void 0?e.isFoundDocument()&&e.version.isEqual(n.updateTime):n.exists===void 0||n.exists===e.isFoundDocument()}class Vr{}function hc(n,e){if(!n.hasLocalMutations||e&&e.fields.length===0)return null;if(e===null)return n.isNoDocument()?new _c(n.key,Ne.none()):new Vn(n.key,n.data,Ne.none());{const t=n.data,r=Te.empty();let s=new ue(ce.comparator);for(let o of e.fields)if(!s.has(o)){let a=t.field(o);a===null&&o.length>1&&(o=o.popLast(),a=t.field(o)),a===null?r.delete(o):r.set(o,a),s=s.add(o)}return new ct(n.key,r,new Ie(s.toArray()),Ne.none())}}function tm(n,e,t){n instanceof Vn?(function(s,o,a){const c=s.value.clone(),h=Ca(s.fieldTransforms,o,a.transformResults);c.setAll(h),o.convertToFoundDocument(a.version,c).setHasCommittedMutations()})(n,e,t):n instanceof ct?(function(s,o,a){if(!cr(s.precondition,o))return void o.convertToUnknownDocument(a.version);const c=Ca(s.fieldTransforms,o,a.transformResults),h=o.data;h.setAll(dc(s)),h.setAll(c),o.convertToFoundDocument(a.version,h).setHasCommittedMutations()})(n,e,t):(function(s,o,a){o.convertToNoDocument(a.version).setHasCommittedMutations()})(0,e,t)}function yn(n,e,t,r){return n instanceof Vn?(function(o,a,c,h){if(!cr(o.precondition,a))return c;const d=o.value.clone(),m=Pa(o.fieldTransforms,h,a);return d.setAll(m),a.convertToFoundDocument(a.version,d).setHasLocalMutations(),null})(n,e,t,r):n instanceof ct?(function(o,a,c,h){if(!cr(o.precondition,a))return c;const d=Pa(o.fieldTransforms,h,a),m=a.data;return m.setAll(dc(o)),m.setAll(d),a.convertToFoundDocument(a.version,m).setHasLocalMutations(),c===null?null:c.unionWith(o.fieldMask.fields).unionWith(o.fieldTransforms.map((w=>w.field)))})(n,e,t,r):(function(o,a,c){return cr(o.precondition,a)?(a.convertToNoDocument(a.version).setHasLocalMutations(),null):c})(n,e,t)}function nm(n,e){let t=null;for(const r of n.fieldTransforms){const s=e.data.field(r.field),o=ac(r.transform,s||null);o!=null&&(t===null&&(t=Te.empty()),t.set(r.field,o))}return t||null}function Sa(n,e){return n.type===e.type&&!!n.key.isEqual(e.key)&&!!n.precondition.isEqual(e.precondition)&&!!(function(r,s){return r===void 0&&s===void 0||!(!r||!s)&&Ot(r,s,((o,a)=>Zf(o,a)))})(n.fieldTransforms,e.fieldTransforms)&&(n.type===0?n.value.isEqual(e.value):n.type!==1||n.data.isEqual(e.data)&&n.fieldMask.isEqual(e.fieldMask))}class Vn extends Vr{constructor(e,t,r,s=[]){super(),this.key=e,this.value=t,this.precondition=r,this.fieldTransforms=s,this.type=0}getFieldMask(){return null}}class ct extends Vr{constructor(e,t,r,s,o=[]){super(),this.key=e,this.data=t,this.fieldMask=r,this.precondition=s,this.fieldTransforms=o,this.type=1}getFieldMask(){return this.fieldMask}}function dc(n){const e=new Map;return n.fieldMask.fields.forEach((t=>{if(!t.isEmpty()){const r=n.data.field(t);e.set(t,r)}})),e}function Ca(n,e,t){const r=new Map;G(n.length===t.length);for(let s=0;s<t.length;s++){const o=n[s],a=o.transform,c=e.data.field(o.field);r.set(o.field,Xf(a,c,t[s]))}return r}function Pa(n,e,t){const r=new Map;for(const s of n){const o=s.transform,a=t.data.field(s.field);r.set(s.field,Yf(o,a,e))}return r}class _c extends Vr{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class rm extends Vr{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class sm{constructor(e,t,r,s){this.batchId=e,this.localWriteTime=t,this.baseMutations=r,this.mutations=s}applyToRemoteDocument(e,t){const r=t.mutationResults;for(let s=0;s<this.mutations.length;s++){const o=this.mutations[s];o.key.isEqual(e.key)&&tm(o,e,r[s])}}applyToLocalView(e,t){for(const r of this.baseMutations)r.key.isEqual(e.key)&&(t=yn(r,e,t,this.localWriteTime));for(const r of this.mutations)r.key.isEqual(e.key)&&(t=yn(r,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const r=sc();return this.mutations.forEach((s=>{const o=e.get(s.key),a=o.overlayedDocument;let c=this.applyToLocalView(a,o.mutatedFields);c=t.has(s.key)?null:c;const h=hc(a,c);h!==null&&r.set(s.key,h),a.isValidDocument()||a.convertToNoDocument(x.min())})),r}keys(){return this.mutations.reduce(((e,t)=>e.add(t.key)),L())}isEqual(e){return this.batchId===e.batchId&&Ot(this.mutations,e.mutations,((t,r)=>Sa(t,r)))&&Ot(this.baseMutations,e.baseMutations,((t,r)=>Sa(t,r)))}}class yi{constructor(e,t,r,s){this.batch=e,this.commitVersion=t,this.mutationResults=r,this.docVersions=s}static from(e,t,r){G(e.mutations.length===r.length);let s=(function(){return Kf})();const o=e.mutations;for(let a=0;a<o.length;a++)s=s.insert(o[a].key,r[a].version);return new yi(e,t,r,s)}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class im{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return e!==null&&this.mutation===e.mutation}toString(){return`Overlay{
      largestBatchId: ${this.largestBatchId},
      mutation: ${this.mutation.toString()}
    }`}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class om{constructor(e,t){this.count=e,this.unchangedNames=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var te,U;function am(n){switch(n){default:return M();case S.CANCELLED:case S.UNKNOWN:case S.DEADLINE_EXCEEDED:case S.RESOURCE_EXHAUSTED:case S.INTERNAL:case S.UNAVAILABLE:case S.UNAUTHENTICATED:return!1;case S.INVALID_ARGUMENT:case S.NOT_FOUND:case S.ALREADY_EXISTS:case S.PERMISSION_DENIED:case S.FAILED_PRECONDITION:case S.ABORTED:case S.OUT_OF_RANGE:case S.UNIMPLEMENTED:case S.DATA_LOSS:return!0}}function fc(n){if(n===void 0)return He("GRPC error has no .code"),S.UNKNOWN;switch(n){case te.OK:return S.OK;case te.CANCELLED:return S.CANCELLED;case te.UNKNOWN:return S.UNKNOWN;case te.DEADLINE_EXCEEDED:return S.DEADLINE_EXCEEDED;case te.RESOURCE_EXHAUSTED:return S.RESOURCE_EXHAUSTED;case te.INTERNAL:return S.INTERNAL;case te.UNAVAILABLE:return S.UNAVAILABLE;case te.UNAUTHENTICATED:return S.UNAUTHENTICATED;case te.INVALID_ARGUMENT:return S.INVALID_ARGUMENT;case te.NOT_FOUND:return S.NOT_FOUND;case te.ALREADY_EXISTS:return S.ALREADY_EXISTS;case te.PERMISSION_DENIED:return S.PERMISSION_DENIED;case te.FAILED_PRECONDITION:return S.FAILED_PRECONDITION;case te.ABORTED:return S.ABORTED;case te.OUT_OF_RANGE:return S.OUT_OF_RANGE;case te.UNIMPLEMENTED:return S.UNIMPLEMENTED;case te.DATA_LOSS:return S.DATA_LOSS;default:return M()}}(U=te||(te={}))[U.OK=0]="OK",U[U.CANCELLED=1]="CANCELLED",U[U.UNKNOWN=2]="UNKNOWN",U[U.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",U[U.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",U[U.NOT_FOUND=5]="NOT_FOUND",U[U.ALREADY_EXISTS=6]="ALREADY_EXISTS",U[U.PERMISSION_DENIED=7]="PERMISSION_DENIED",U[U.UNAUTHENTICATED=16]="UNAUTHENTICATED",U[U.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",U[U.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",U[U.ABORTED=10]="ABORTED",U[U.OUT_OF_RANGE=11]="OUT_OF_RANGE",U[U.UNIMPLEMENTED=12]="UNIMPLEMENTED",U[U.INTERNAL=13]="INTERNAL",U[U.UNAVAILABLE=14]="UNAVAILABLE",U[U.DATA_LOSS=15]="DATA_LOSS";/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function lm(){return new TextEncoder}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const cm=new pt([4294967295,4294967295],0);function Da(n){const e=lm().encode(n),t=new xl;return t.update(e),new Uint8Array(t.digest())}function ka(n){const e=new DataView(n.buffer),t=e.getUint32(0,!0),r=e.getUint32(4,!0),s=e.getUint32(8,!0),o=e.getUint32(12,!0);return[new pt([t,r],0),new pt([s,o],0)]}class vi{constructor(e,t,r){if(this.bitmap=e,this.padding=t,this.hashCount=r,t<0||t>=8)throw new dn(`Invalid padding: ${t}`);if(r<0)throw new dn(`Invalid hash count: ${r}`);if(e.length>0&&this.hashCount===0)throw new dn(`Invalid hash count: ${r}`);if(e.length===0&&t!==0)throw new dn(`Invalid padding when bitmap length is 0: ${t}`);this.Ie=8*e.length-t,this.Te=pt.fromNumber(this.Ie)}Ee(e,t,r){let s=e.add(t.multiply(pt.fromNumber(r)));return s.compare(cm)===1&&(s=new pt([s.getBits(0),s.getBits(1)],0)),s.modulo(this.Te).toNumber()}de(e){return(this.bitmap[Math.floor(e/8)]&1<<e%8)!=0}mightContain(e){if(this.Ie===0)return!1;const t=Da(e),[r,s]=ka(t);for(let o=0;o<this.hashCount;o++){const a=this.Ee(r,s,o);if(!this.de(a))return!1}return!0}static create(e,t,r){const s=e%8==0?0:8-e%8,o=new Uint8Array(Math.ceil(e/8)),a=new vi(o,s,t);return r.forEach((c=>a.insert(c))),a}insert(e){if(this.Ie===0)return;const t=Da(e),[r,s]=ka(t);for(let o=0;o<this.hashCount;o++){const a=this.Ee(r,s,o);this.Ae(a)}}Ae(e){const t=Math.floor(e/8),r=e%8;this.bitmap[t]|=1<<r}}class dn extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Br{constructor(e,t,r,s,o){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=r,this.documentUpdates=s,this.resolvedLimboDocuments=o}static createSynthesizedRemoteEventForCurrentChange(e,t,r){const s=new Map;return s.set(e,Bn.createSynthesizedTargetChangeForCurrentChange(e,t,r)),new Br(x.min(),s,new J(q),We(),L())}}class Bn{constructor(e,t,r,s,o){this.resumeToken=e,this.current=t,this.addedDocuments=r,this.modifiedDocuments=s,this.removedDocuments=o}static createSynthesizedTargetChangeForCurrentChange(e,t,r){return new Bn(r,t,L(),L(),L())}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ur{constructor(e,t,r,s){this.Re=e,this.removedTargetIds=t,this.key=r,this.Ve=s}}class mc{constructor(e,t){this.targetId=e,this.me=t}}class gc{constructor(e,t,r=he.EMPTY_BYTE_STRING,s=null){this.state=e,this.targetIds=t,this.resumeToken=r,this.cause=s}}class Va{constructor(){this.fe=0,this.ge=Na(),this.pe=he.EMPTY_BYTE_STRING,this.ye=!1,this.we=!0}get current(){return this.ye}get resumeToken(){return this.pe}get Se(){return this.fe!==0}get be(){return this.we}De(e){e.approximateByteSize()>0&&(this.we=!0,this.pe=e)}ve(){let e=L(),t=L(),r=L();return this.ge.forEach(((s,o)=>{switch(o){case 0:e=e.add(s);break;case 2:t=t.add(s);break;case 1:r=r.add(s);break;default:M()}})),new Bn(this.pe,this.ye,e,t,r)}Ce(){this.we=!1,this.ge=Na()}Fe(e,t){this.we=!0,this.ge=this.ge.insert(e,t)}Me(e){this.we=!0,this.ge=this.ge.remove(e)}xe(){this.fe+=1}Oe(){this.fe-=1,G(this.fe>=0)}Ne(){this.we=!0,this.ye=!0}}class um{constructor(e){this.Le=e,this.Be=new Map,this.ke=We(),this.qe=Ba(),this.Qe=new J(q)}Ke(e){for(const t of e.Re)e.Ve&&e.Ve.isFoundDocument()?this.$e(t,e.Ve):this.Ue(t,e.key,e.Ve);for(const t of e.removedTargetIds)this.Ue(t,e.key,e.Ve)}We(e){this.forEachTarget(e,(t=>{const r=this.Ge(t);switch(e.state){case 0:this.ze(t)&&r.De(e.resumeToken);break;case 1:r.Oe(),r.Se||r.Ce(),r.De(e.resumeToken);break;case 2:r.Oe(),r.Se||this.removeTarget(t);break;case 3:this.ze(t)&&(r.Ne(),r.De(e.resumeToken));break;case 4:this.ze(t)&&(this.je(t),r.De(e.resumeToken));break;default:M()}}))}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.Be.forEach(((r,s)=>{this.ze(s)&&t(s)}))}He(e){const t=e.targetId,r=e.me.count,s=this.Je(t);if(s){const o=s.target;if(zs(o))if(r===0){const a=new O(o.path);this.Ue(t,a,ye.newNoDocument(a,x.min()))}else G(r===1);else{const a=this.Ye(t);if(a!==r){const c=this.Ze(e),h=c?this.Xe(c,e,a):1;if(h!==0){this.je(t);const d=h===2?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Qe=this.Qe.insert(t,d)}}}}}Ze(e){const t=e.me.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:r="",padding:s=0},hashCount:o=0}=t;let a,c;try{a=Tt(r).toUint8Array()}catch(h){if(h instanceof Kl)return Nt("Decoding the base64 bloom filter in existence filter failed ("+h.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw h}try{c=new vi(a,s,o)}catch(h){return Nt(h instanceof dn?"BloomFilter error: ":"Applying bloom filter failed: ",h),null}return c.Ie===0?null:c}Xe(e,t,r){return t.me.count===r-this.nt(e,t.targetId)?0:2}nt(e,t){const r=this.Le.getRemoteKeysForTarget(t);let s=0;return r.forEach((o=>{const a=this.Le.tt(),c=`projects/${a.projectId}/databases/${a.database}/documents/${o.path.canonicalString()}`;e.mightContain(c)||(this.Ue(t,o,null),s++)})),s}rt(e){const t=new Map;this.Be.forEach(((o,a)=>{const c=this.Je(a);if(c){if(o.current&&zs(c.target)){const h=new O(c.target.path);this.ke.get(h)!==null||this.it(a,h)||this.Ue(a,h,ye.newNoDocument(h,e))}o.be&&(t.set(a,o.ve()),o.Ce())}}));let r=L();this.qe.forEach(((o,a)=>{let c=!0;a.forEachWhile((h=>{const d=this.Je(h);return!d||d.purpose==="TargetPurposeLimboResolution"||(c=!1,!1)})),c&&(r=r.add(o))})),this.ke.forEach(((o,a)=>a.setReadTime(e)));const s=new Br(e,t,this.Qe,this.ke,r);return this.ke=We(),this.qe=Ba(),this.Qe=new J(q),s}$e(e,t){if(!this.ze(e))return;const r=this.it(e,t.key)?2:0;this.Ge(e).Fe(t.key,r),this.ke=this.ke.insert(t.key,t),this.qe=this.qe.insert(t.key,this.st(t.key).add(e))}Ue(e,t,r){if(!this.ze(e))return;const s=this.Ge(e);this.it(e,t)?s.Fe(t,1):s.Me(t),this.qe=this.qe.insert(t,this.st(t).delete(e)),r&&(this.ke=this.ke.insert(t,r))}removeTarget(e){this.Be.delete(e)}Ye(e){const t=this.Ge(e).ve();return this.Le.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}xe(e){this.Ge(e).xe()}Ge(e){let t=this.Be.get(e);return t||(t=new Va,this.Be.set(e,t)),t}st(e){let t=this.qe.get(e);return t||(t=new ue(q),this.qe=this.qe.insert(e,t)),t}ze(e){const t=this.Je(e)!==null;return t||V("WatchChangeAggregator","Detected inactive target",e),t}Je(e){const t=this.Be.get(e);return t&&t.Se?null:this.Le.ot(e)}je(e){this.Be.set(e,new Va),this.Le.getRemoteKeysForTarget(e).forEach((t=>{this.Ue(e,t,null)}))}it(e,t){return this.Le.getRemoteKeysForTarget(e).has(t)}}function Ba(){return new J(O.comparator)}function Na(){return new J(O.comparator)}const hm={asc:"ASCENDING",desc:"DESCENDING"},dm={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"},_m={and:"AND",or:"OR"};class fm{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function qs(n,e){return n.useProto3Json||Sr(e)?e:{value:e}}function vr(n,e){return n.useProto3Json?`${new Date(1e3*e.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+e.nanoseconds).slice(-9)}Z`:{seconds:""+e.seconds,nanos:e.nanoseconds}}function pc(n,e){return n.useProto3Json?e.toBase64():e.toUint8Array()}function mm(n,e){return vr(n,e.toTimestamp())}function Oe(n){return G(!!n),x.fromTimestamp((function(t){const r=ot(t);return new $(r.seconds,r.nanos)})(n))}function Ei(n,e){return $s(n,e).canonicalString()}function $s(n,e){const t=(function(s){return new X(["projects",s.projectId,"databases",s.database])})(n).child("documents");return e===void 0?t:t.child(e)}function yc(n){const e=X.fromString(n);return G(wc(e)),e}function Gs(n,e){return Ei(n.databaseId,e.path)}function ws(n,e){const t=yc(e);if(t.get(1)!==n.databaseId.projectId)throw new B(S.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+t.get(1)+" vs "+n.databaseId.projectId);if(t.get(3)!==n.databaseId.database)throw new B(S.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+t.get(3)+" vs "+n.databaseId.database);return new O(Ec(t))}function vc(n,e){return Ei(n.databaseId,e)}function gm(n){const e=yc(n);return e.length===4?X.emptyPath():Ec(e)}function Ks(n){return new X(["projects",n.databaseId.projectId,"databases",n.databaseId.database]).canonicalString()}function Ec(n){return G(n.length>4&&n.get(4)==="documents"),n.popFirst(5)}function Oa(n,e,t){return{name:Gs(n,e),fields:t.value.mapValue.fields}}function pm(n,e){let t;if("targetChange"in e){e.targetChange;const r=(function(d){return d==="NO_CHANGE"?0:d==="ADD"?1:d==="REMOVE"?2:d==="CURRENT"?3:d==="RESET"?4:M()})(e.targetChange.targetChangeType||"NO_CHANGE"),s=e.targetChange.targetIds||[],o=(function(d,m){return d.useProto3Json?(G(m===void 0||typeof m=="string"),he.fromBase64String(m||"")):(G(m===void 0||m instanceof Buffer||m instanceof Uint8Array),he.fromUint8Array(m||new Uint8Array))})(n,e.targetChange.resumeToken),a=e.targetChange.cause,c=a&&(function(d){const m=d.code===void 0?S.UNKNOWN:fc(d.code);return new B(m,d.message||"")})(a);t=new gc(r,s,o,c||null)}else if("documentChange"in e){e.documentChange;const r=e.documentChange;r.document,r.document.name,r.document.updateTime;const s=ws(n,r.document.name),o=Oe(r.document.updateTime),a=r.document.createTime?Oe(r.document.createTime):x.min(),c=new Te({mapValue:{fields:r.document.fields}}),h=ye.newFoundDocument(s,o,a,c),d=r.targetIds||[],m=r.removedTargetIds||[];t=new ur(d,m,h.key,h)}else if("documentDelete"in e){e.documentDelete;const r=e.documentDelete;r.document;const s=ws(n,r.document),o=r.readTime?Oe(r.readTime):x.min(),a=ye.newNoDocument(s,o),c=r.removedTargetIds||[];t=new ur([],c,a.key,a)}else if("documentRemove"in e){e.documentRemove;const r=e.documentRemove;r.document;const s=ws(n,r.document),o=r.removedTargetIds||[];t=new ur([],o,s,null)}else{if(!("filter"in e))return M();{e.filter;const r=e.filter;r.targetId;const{count:s=0,unchangedNames:o}=r,a=new om(s,o),c=r.targetId;t=new mc(c,a)}}return t}function ym(n,e){let t;if(e instanceof Vn)t={update:Oa(n,e.key,e.value)};else if(e instanceof _c)t={delete:Gs(n,e.key)};else if(e instanceof ct)t={update:Oa(n,e.key,e.data),updateMask:Sm(e.fieldMask)};else{if(!(e instanceof rm))return M();t={verify:Gs(n,e.key)}}return e.fieldTransforms.length>0&&(t.updateTransforms=e.fieldTransforms.map((r=>(function(o,a){const c=a.transform;if(c instanceof yr)return{fieldPath:a.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(c instanceof In)return{fieldPath:a.field.canonicalString(),appendMissingElements:{values:c.elements}};if(c instanceof bn)return{fieldPath:a.field.canonicalString(),removeAllFromArray:{values:c.elements}};if(c instanceof Sn)return{fieldPath:a.field.canonicalString(),increment:c.Pe};throw M()})(0,r)))),e.precondition.isNone||(t.currentDocument=(function(s,o){return o.updateTime!==void 0?{updateTime:mm(s,o.updateTime)}:o.exists!==void 0?{exists:o.exists}:M()})(n,e.precondition)),t}function vm(n,e){return n&&n.length>0?(G(e!==void 0),n.map((t=>(function(s,o){let a=s.updateTime?Oe(s.updateTime):Oe(o);return a.isEqual(x.min())&&(a=Oe(o)),new em(a,s.transformResults||[])})(t,e)))):[]}function Em(n,e){return{documents:[vc(n,e.path)]}}function Tm(n,e){const t={structuredQuery:{}},r=e.path;let s;e.collectionGroup!==null?(s=r,t.structuredQuery.from=[{collectionId:e.collectionGroup,allDescendants:!0}]):(s=r.popLast(),t.structuredQuery.from=[{collectionId:r.lastSegment()}]),t.parent=vc(n,s);const o=(function(d){if(d.length!==0)return Rc(xe.create(d,"and"))})(e.filters);o&&(t.structuredQuery.where=o);const a=(function(d){if(d.length!==0)return d.map((m=>(function(A){return{field:Dt(A.field),direction:Am(A.dir)}})(m)))})(e.orderBy);a&&(t.structuredQuery.orderBy=a);const c=qs(n,e.limit);return c!==null&&(t.structuredQuery.limit=c),e.startAt&&(t.structuredQuery.startAt=(function(d){return{before:d.inclusive,values:d.position}})(e.startAt)),e.endAt&&(t.structuredQuery.endAt=(function(d){return{before:!d.inclusive,values:d.position}})(e.endAt)),{_t:t,parent:s}}function Rm(n){let e=gm(n.parent);const t=n.structuredQuery,r=t.from?t.from.length:0;let s=null;if(r>0){G(r===1);const m=t.from[0];m.allDescendants?s=m.collectionId:e=e.child(m.collectionId)}let o=[];t.where&&(o=(function(w){const A=Tc(w);return A instanceof xe&&Yl(A)?A.getFilters():[A]})(t.where));let a=[];t.orderBy&&(a=(function(w){return w.map((A=>(function(k){return new pr(kt(k.field),(function(D){switch(D){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}})(k.direction))})(A)))})(t.orderBy));let c=null;t.limit&&(c=(function(w){let A;return A=typeof w=="object"?w.value:w,Sr(A)?null:A})(t.limit));let h=null;t.startAt&&(h=(function(w){const A=!!w.before,b=w.values||[];return new gr(b,A)})(t.startAt));let d=null;return t.endAt&&(d=(function(w){const A=!w.before,b=w.values||[];return new gr(b,A)})(t.endAt)),Uf(e,s,a,o,c,"F",h,d)}function wm(n,e){const t=(function(s){switch(s){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return M()}})(e.purpose);return t==null?null:{"goog-listen-tags":t}}function Tc(n){return n.unaryFilter!==void 0?(function(t){switch(t.unaryFilter.op){case"IS_NAN":const r=kt(t.unaryFilter.field);return ne.create(r,"==",{doubleValue:NaN});case"IS_NULL":const s=kt(t.unaryFilter.field);return ne.create(s,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const o=kt(t.unaryFilter.field);return ne.create(o,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const a=kt(t.unaryFilter.field);return ne.create(a,"!=",{nullValue:"NULL_VALUE"});default:return M()}})(n):n.fieldFilter!==void 0?(function(t){return ne.create(kt(t.fieldFilter.field),(function(s){switch(s){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";default:return M()}})(t.fieldFilter.op),t.fieldFilter.value)})(n):n.compositeFilter!==void 0?(function(t){return xe.create(t.compositeFilter.filters.map((r=>Tc(r))),(function(s){switch(s){case"AND":return"and";case"OR":return"or";default:return M()}})(t.compositeFilter.op))})(n):M()}function Am(n){return hm[n]}function Im(n){return dm[n]}function bm(n){return _m[n]}function Dt(n){return{fieldPath:n.canonicalString()}}function kt(n){return ce.fromServerFormat(n.fieldPath)}function Rc(n){return n instanceof ne?(function(t){if(t.op==="=="){if(Ta(t.value))return{unaryFilter:{field:Dt(t.field),op:"IS_NAN"}};if(Ea(t.value))return{unaryFilter:{field:Dt(t.field),op:"IS_NULL"}}}else if(t.op==="!="){if(Ta(t.value))return{unaryFilter:{field:Dt(t.field),op:"IS_NOT_NAN"}};if(Ea(t.value))return{unaryFilter:{field:Dt(t.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:Dt(t.field),op:Im(t.op),value:t.value}}})(n):n instanceof xe?(function(t){const r=t.getFilters().map((s=>Rc(s)));return r.length===1?r[0]:{compositeFilter:{op:bm(t.op),filters:r}}})(n):M()}function Sm(n){const e=[];return n.fields.forEach((t=>e.push(t.canonicalString()))),{fieldPaths:e}}function wc(n){return n.length>=4&&n.get(0)==="projects"&&n.get(2)==="databases"}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class et{constructor(e,t,r,s,o=x.min(),a=x.min(),c=he.EMPTY_BYTE_STRING,h=null){this.target=e,this.targetId=t,this.purpose=r,this.sequenceNumber=s,this.snapshotVersion=o,this.lastLimboFreeSnapshotVersion=a,this.resumeToken=c,this.expectedCount=h}withSequenceNumber(e){return new et(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new et(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new et(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new et(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Cm{constructor(e){this.ct=e}}function Pm(n){const e=Rm({parent:n.parent,structuredQuery:n.structuredQuery});return n.limitType==="LAST"?js(e,e.limit,"L"):e}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Dm{constructor(){this.un=new km}addToCollectionParentIndex(e,t){return this.un.add(t),C.resolve()}getCollectionParents(e,t){return C.resolve(this.un.getEntries(t))}addFieldIndex(e,t){return C.resolve()}deleteFieldIndex(e,t){return C.resolve()}deleteAllFieldIndexes(e){return C.resolve()}createTargetIndexes(e,t){return C.resolve()}getDocumentsMatchingTarget(e,t){return C.resolve(null)}getIndexType(e,t){return C.resolve(0)}getFieldIndexes(e,t){return C.resolve([])}getNextCollectionGroupToUpdate(e){return C.resolve(null)}getMinOffset(e,t){return C.resolve(it.min())}getMinOffsetFromCollectionGroup(e,t){return C.resolve(it.min())}updateCollectionGroup(e,t,r){return C.resolve()}updateIndexEntries(e,t){return C.resolve()}}class km{constructor(){this.index={}}add(e){const t=e.lastSegment(),r=e.popLast(),s=this.index[t]||new ue(X.comparator),o=!s.has(r);return this.index[t]=s.add(r),o}has(e){const t=e.lastSegment(),r=e.popLast(),s=this.index[t];return s&&s.has(r)}getEntries(e){return(this.index[e]||new ue(X.comparator)).toArray()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ft{constructor(e){this.Ln=e}next(){return this.Ln+=2,this.Ln}static Bn(){return new Ft(0)}static kn(){return new Ft(-1)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vm{constructor(){this.changes=new jt((e=>e.toString()),((e,t)=>e.isEqual(t))),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,ye.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const r=this.changes.get(t);return r!==void 0?C.resolve(r):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bm{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nm{constructor(e,t,r,s){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=r,this.indexManager=s}getDocument(e,t){let r=null;return this.documentOverlayCache.getOverlay(e,t).next((s=>(r=s,this.remoteDocumentCache.getEntry(e,t)))).next((s=>(r!==null&&yn(r.mutation,s,Ie.empty(),$.now()),s)))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next((r=>this.getLocalViewOfDocuments(e,r,L()).next((()=>r))))}getLocalViewOfDocuments(e,t,r=L()){const s=gt();return this.populateOverlays(e,s,t).next((()=>this.computeViews(e,t,s,r).next((o=>{let a=hn();return o.forEach(((c,h)=>{a=a.insert(c,h.overlayedDocument)})),a}))))}getOverlayedDocuments(e,t){const r=gt();return this.populateOverlays(e,r,t).next((()=>this.computeViews(e,t,r,L())))}populateOverlays(e,t,r){const s=[];return r.forEach((o=>{t.has(o)||s.push(o)})),this.documentOverlayCache.getOverlays(e,s).next((o=>{o.forEach(((a,c)=>{t.set(a,c)}))}))}computeViews(e,t,r,s){let o=We();const a=pn(),c=(function(){return pn()})();return t.forEach(((h,d)=>{const m=r.get(d.key);s.has(d.key)&&(m===void 0||m.mutation instanceof ct)?o=o.insert(d.key,d):m!==void 0?(a.set(d.key,m.mutation.getFieldMask()),yn(m.mutation,d,m.mutation.getFieldMask(),$.now())):a.set(d.key,Ie.empty())})),this.recalculateAndSaveOverlays(e,o).next((h=>(h.forEach(((d,m)=>a.set(d,m))),t.forEach(((d,m)=>{var w;return c.set(d,new Bm(m,(w=a.get(d))!==null&&w!==void 0?w:null))})),c)))}recalculateAndSaveOverlays(e,t){const r=pn();let s=new J(((a,c)=>a-c)),o=L();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next((a=>{for(const c of a)c.keys().forEach((h=>{const d=t.get(h);if(d===null)return;let m=r.get(h)||Ie.empty();m=c.applyToLocalView(d,m),r.set(h,m);const w=(s.get(c.batchId)||L()).add(h);s=s.insert(c.batchId,w)}))})).next((()=>{const a=[],c=s.getReverseIterator();for(;c.hasNext();){const h=c.getNext(),d=h.key,m=h.value,w=sc();m.forEach((A=>{if(!o.has(A)){const b=hc(t.get(A),r.get(A));b!==null&&w.set(A,b),o=o.add(A)}})),a.push(this.documentOverlayCache.saveOverlays(e,d,w))}return C.waitFor(a)})).next((()=>r))}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next((r=>this.recalculateAndSaveOverlays(e,r)))}getDocumentsMatchingQuery(e,t,r,s){return(function(a){return O.isDocumentKey(a.path)&&a.collectionGroup===null&&a.filters.length===0})(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):zf(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,r,s):this.getDocumentsMatchingCollectionQuery(e,t,r,s)}getNextDocuments(e,t,r,s){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,r,s).next((o=>{const a=s-o.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,r.largestBatchId,s-o.size):C.resolve(gt());let c=-1,h=o;return a.next((d=>C.forEach(d,((m,w)=>(c<w.largestBatchId&&(c=w.largestBatchId),o.get(m)?C.resolve():this.remoteDocumentCache.getEntry(e,m).next((A=>{h=h.insert(m,A)}))))).next((()=>this.populateOverlays(e,d,o))).next((()=>this.computeViews(e,h,d,L()))).next((m=>({batchId:c,changes:rc(m)})))))}))}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new O(t)).next((r=>{let s=hn();return r.isFoundDocument()&&(s=s.insert(r.key,r)),s}))}getDocumentsMatchingCollectionGroupQuery(e,t,r,s){const o=t.collectionGroup;let a=hn();return this.indexManager.getCollectionParents(e,o).next((c=>C.forEach(c,(h=>{const d=(function(w,A){return new Cr(A,null,w.explicitOrderBy.slice(),w.filters.slice(),w.limit,w.limitType,w.startAt,w.endAt)})(t,h.child(o));return this.getDocumentsMatchingCollectionQuery(e,d,r,s).next((m=>{m.forEach(((w,A)=>{a=a.insert(w,A)}))}))})).next((()=>a))))}getDocumentsMatchingCollectionQuery(e,t,r,s){let o;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,r.largestBatchId).next((a=>(o=a,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,r,o,s)))).next((a=>{o.forEach(((h,d)=>{const m=d.getKey();a.get(m)===null&&(a=a.insert(m,ye.newInvalidDocument(m)))}));let c=hn();return a.forEach(((h,d)=>{const m=o.get(h);m!==void 0&&yn(m.mutation,d,Ie.empty(),$.now()),Dr(t,d)&&(c=c.insert(h,d))})),c}))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Om{constructor(e){this.serializer=e,this.hr=new Map,this.Pr=new Map}getBundleMetadata(e,t){return C.resolve(this.hr.get(t))}saveBundleMetadata(e,t){return this.hr.set(t.id,(function(s){return{id:s.id,version:s.version,createTime:Oe(s.createTime)}})(t)),C.resolve()}getNamedQuery(e,t){return C.resolve(this.Pr.get(t))}saveNamedQuery(e,t){return this.Pr.set(t.name,(function(s){return{name:s.name,query:Pm(s.bundledQuery),readTime:Oe(s.readTime)}})(t)),C.resolve()}}/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mm{constructor(){this.overlays=new J(O.comparator),this.Ir=new Map}getOverlay(e,t){return C.resolve(this.overlays.get(t))}getOverlays(e,t){const r=gt();return C.forEach(t,(s=>this.getOverlay(e,s).next((o=>{o!==null&&r.set(s,o)})))).next((()=>r))}saveOverlays(e,t,r){return r.forEach(((s,o)=>{this.ht(e,t,o)})),C.resolve()}removeOverlaysForBatchId(e,t,r){const s=this.Ir.get(r);return s!==void 0&&(s.forEach((o=>this.overlays=this.overlays.remove(o))),this.Ir.delete(r)),C.resolve()}getOverlaysForCollection(e,t,r){const s=gt(),o=t.length+1,a=new O(t.child("")),c=this.overlays.getIteratorFrom(a);for(;c.hasNext();){const h=c.getNext().value,d=h.getKey();if(!t.isPrefixOf(d.path))break;d.path.length===o&&h.largestBatchId>r&&s.set(h.getKey(),h)}return C.resolve(s)}getOverlaysForCollectionGroup(e,t,r,s){let o=new J(((d,m)=>d-m));const a=this.overlays.getIterator();for(;a.hasNext();){const d=a.getNext().value;if(d.getKey().getCollectionGroup()===t&&d.largestBatchId>r){let m=o.get(d.largestBatchId);m===null&&(m=gt(),o=o.insert(d.largestBatchId,m)),m.set(d.getKey(),d)}}const c=gt(),h=o.getIterator();for(;h.hasNext()&&(h.getNext().value.forEach(((d,m)=>c.set(d,m))),!(c.size()>=s)););return C.resolve(c)}ht(e,t,r){const s=this.overlays.get(r.key);if(s!==null){const a=this.Ir.get(s.largestBatchId).delete(r.key);this.Ir.set(s.largestBatchId,a)}this.overlays=this.overlays.insert(r.key,new im(t,r));let o=this.Ir.get(t);o===void 0&&(o=L(),this.Ir.set(t,o)),this.Ir.set(t,o.add(r.key))}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xm{constructor(){this.sessionToken=he.EMPTY_BYTE_STRING}getSessionToken(e){return C.resolve(this.sessionToken)}setSessionToken(e,t){return this.sessionToken=t,C.resolve()}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ti{constructor(){this.Tr=new ue(se.Er),this.dr=new ue(se.Ar)}isEmpty(){return this.Tr.isEmpty()}addReference(e,t){const r=new se(e,t);this.Tr=this.Tr.add(r),this.dr=this.dr.add(r)}Rr(e,t){e.forEach((r=>this.addReference(r,t)))}removeReference(e,t){this.Vr(new se(e,t))}mr(e,t){e.forEach((r=>this.removeReference(r,t)))}gr(e){const t=new O(new X([])),r=new se(t,e),s=new se(t,e+1),o=[];return this.dr.forEachInRange([r,s],(a=>{this.Vr(a),o.push(a.key)})),o}pr(){this.Tr.forEach((e=>this.Vr(e)))}Vr(e){this.Tr=this.Tr.delete(e),this.dr=this.dr.delete(e)}yr(e){const t=new O(new X([])),r=new se(t,e),s=new se(t,e+1);let o=L();return this.dr.forEachInRange([r,s],(a=>{o=o.add(a.key)})),o}containsKey(e){const t=new se(e,0),r=this.Tr.firstAfterOrEqual(t);return r!==null&&e.isEqual(r.key)}}class se{constructor(e,t){this.key=e,this.wr=t}static Er(e,t){return O.comparator(e.key,t.key)||q(e.wr,t.wr)}static Ar(e,t){return q(e.wr,t.wr)||O.comparator(e.key,t.key)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fm{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.Sr=1,this.br=new ue(se.Er)}checkEmpty(e){return C.resolve(this.mutationQueue.length===0)}addMutationBatch(e,t,r,s){const o=this.Sr;this.Sr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const a=new sm(o,t,r,s);this.mutationQueue.push(a);for(const c of s)this.br=this.br.add(new se(c.key,o)),this.indexManager.addToCollectionParentIndex(e,c.key.path.popLast());return C.resolve(a)}lookupMutationBatch(e,t){return C.resolve(this.Dr(t))}getNextMutationBatchAfterBatchId(e,t){const r=t+1,s=this.vr(r),o=s<0?0:s;return C.resolve(this.mutationQueue.length>o?this.mutationQueue[o]:null)}getHighestUnacknowledgedBatchId(){return C.resolve(this.mutationQueue.length===0?-1:this.Sr-1)}getAllMutationBatches(e){return C.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const r=new se(t,0),s=new se(t,Number.POSITIVE_INFINITY),o=[];return this.br.forEachInRange([r,s],(a=>{const c=this.Dr(a.wr);o.push(c)})),C.resolve(o)}getAllMutationBatchesAffectingDocumentKeys(e,t){let r=new ue(q);return t.forEach((s=>{const o=new se(s,0),a=new se(s,Number.POSITIVE_INFINITY);this.br.forEachInRange([o,a],(c=>{r=r.add(c.wr)}))})),C.resolve(this.Cr(r))}getAllMutationBatchesAffectingQuery(e,t){const r=t.path,s=r.length+1;let o=r;O.isDocumentKey(o)||(o=o.child(""));const a=new se(new O(o),0);let c=new ue(q);return this.br.forEachWhile((h=>{const d=h.key.path;return!!r.isPrefixOf(d)&&(d.length===s&&(c=c.add(h.wr)),!0)}),a),C.resolve(this.Cr(c))}Cr(e){const t=[];return e.forEach((r=>{const s=this.Dr(r);s!==null&&t.push(s)})),t}removeMutationBatch(e,t){G(this.Fr(t.batchId,"removed")===0),this.mutationQueue.shift();let r=this.br;return C.forEach(t.mutations,(s=>{const o=new se(s.key,t.batchId);return r=r.delete(o),this.referenceDelegate.markPotentiallyOrphaned(e,s.key)})).next((()=>{this.br=r}))}On(e){}containsKey(e,t){const r=new se(t,0),s=this.br.firstAfterOrEqual(r);return C.resolve(t.isEqual(s&&s.key))}performConsistencyCheck(e){return this.mutationQueue.length,C.resolve()}Fr(e,t){return this.vr(e)}vr(e){return this.mutationQueue.length===0?0:e-this.mutationQueue[0].batchId}Dr(e){const t=this.vr(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lm{constructor(e){this.Mr=e,this.docs=(function(){return new J(O.comparator)})(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const r=t.key,s=this.docs.get(r),o=s?s.size:0,a=this.Mr(t);return this.docs=this.docs.insert(r,{document:t.mutableCopy(),size:a}),this.size+=a-o,this.indexManager.addToCollectionParentIndex(e,r.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const r=this.docs.get(t);return C.resolve(r?r.document.mutableCopy():ye.newInvalidDocument(t))}getEntries(e,t){let r=We();return t.forEach((s=>{const o=this.docs.get(s);r=r.insert(s,o?o.document.mutableCopy():ye.newInvalidDocument(s))})),C.resolve(r)}getDocumentsMatchingQuery(e,t,r,s){let o=We();const a=t.path,c=new O(a.child("")),h=this.docs.getIteratorFrom(c);for(;h.hasNext();){const{key:d,value:{document:m}}=h.getNext();if(!a.isPrefixOf(d.path))break;d.path.length>a.length+1||Tf(Ef(m),r)<=0||(s.has(m.key)||Dr(t,m))&&(o=o.insert(m.key,m.mutableCopy()))}return C.resolve(o)}getAllFromCollectionGroup(e,t,r,s){M()}Or(e,t){return C.forEach(this.docs,(r=>t(r)))}newChangeBuffer(e){return new Um(this)}getSize(e){return C.resolve(this.size)}}class Um extends Vm{constructor(e){super(),this.cr=e}applyChanges(e){const t=[];return this.changes.forEach(((r,s)=>{s.isValidDocument()?t.push(this.cr.addEntry(e,s)):this.cr.removeEntry(r)})),C.waitFor(t)}getFromCache(e,t){return this.cr.getEntry(e,t)}getAllFromCache(e,t){return this.cr.getEntries(e,t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class zm{constructor(e){this.persistence=e,this.Nr=new jt((t=>fi(t)),mi),this.lastRemoteSnapshotVersion=x.min(),this.highestTargetId=0,this.Lr=0,this.Br=new Ti,this.targetCount=0,this.kr=Ft.Bn()}forEachTarget(e,t){return this.Nr.forEach(((r,s)=>t(s))),C.resolve()}getLastRemoteSnapshotVersion(e){return C.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return C.resolve(this.Lr)}allocateTargetId(e){return this.highestTargetId=this.kr.next(),C.resolve(this.highestTargetId)}setTargetsMetadata(e,t,r){return r&&(this.lastRemoteSnapshotVersion=r),t>this.Lr&&(this.Lr=t),C.resolve()}Kn(e){this.Nr.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.kr=new Ft(t),this.highestTargetId=t),e.sequenceNumber>this.Lr&&(this.Lr=e.sequenceNumber)}addTargetData(e,t){return this.Kn(t),this.targetCount+=1,C.resolve()}updateTargetData(e,t){return this.Kn(t),C.resolve()}removeTargetData(e,t){return this.Nr.delete(t.target),this.Br.gr(t.targetId),this.targetCount-=1,C.resolve()}removeTargets(e,t,r){let s=0;const o=[];return this.Nr.forEach(((a,c)=>{c.sequenceNumber<=t&&r.get(c.targetId)===null&&(this.Nr.delete(a),o.push(this.removeMatchingKeysForTargetId(e,c.targetId)),s++)})),C.waitFor(o).next((()=>s))}getTargetCount(e){return C.resolve(this.targetCount)}getTargetData(e,t){const r=this.Nr.get(t)||null;return C.resolve(r)}addMatchingKeys(e,t,r){return this.Br.Rr(t,r),C.resolve()}removeMatchingKeys(e,t,r){this.Br.mr(t,r);const s=this.persistence.referenceDelegate,o=[];return s&&t.forEach((a=>{o.push(s.markPotentiallyOrphaned(e,a))})),C.waitFor(o)}removeMatchingKeysForTargetId(e,t){return this.Br.gr(t),C.resolve()}getMatchingKeysForTargetId(e,t){const r=this.Br.yr(t);return C.resolve(r)}containsKey(e,t){return C.resolve(this.Br.containsKey(t))}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jm{constructor(e,t){this.qr={},this.overlays={},this.Qr=new ui(0),this.Kr=!1,this.Kr=!0,this.$r=new xm,this.referenceDelegate=e(this),this.Ur=new zm(this),this.indexManager=new Dm,this.remoteDocumentCache=(function(s){return new Lm(s)})((r=>this.referenceDelegate.Wr(r))),this.serializer=new Cm(t),this.Gr=new Om(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.Kr=!1,Promise.resolve()}get started(){return this.Kr}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new Mm,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let r=this.qr[e.toKey()];return r||(r=new Fm(t,this.referenceDelegate),this.qr[e.toKey()]=r),r}getGlobalsCache(){return this.$r}getTargetCache(){return this.Ur}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.Gr}runTransaction(e,t,r){V("MemoryPersistence","Starting transaction:",e);const s=new qm(this.Qr.next());return this.referenceDelegate.zr(),r(s).next((o=>this.referenceDelegate.jr(s).next((()=>o)))).toPromise().then((o=>(s.raiseOnCommittedEvent(),o)))}Hr(e,t){return C.or(Object.values(this.qr).map((r=>()=>r.containsKey(e,t))))}}class qm extends wf{constructor(e){super(),this.currentSequenceNumber=e}}class Ri{constructor(e){this.persistence=e,this.Jr=new Ti,this.Yr=null}static Zr(e){return new Ri(e)}get Xr(){if(this.Yr)return this.Yr;throw M()}addReference(e,t,r){return this.Jr.addReference(r,t),this.Xr.delete(r.toString()),C.resolve()}removeReference(e,t,r){return this.Jr.removeReference(r,t),this.Xr.add(r.toString()),C.resolve()}markPotentiallyOrphaned(e,t){return this.Xr.add(t.toString()),C.resolve()}removeTarget(e,t){this.Jr.gr(t.targetId).forEach((s=>this.Xr.add(s.toString())));const r=this.persistence.getTargetCache();return r.getMatchingKeysForTargetId(e,t.targetId).next((s=>{s.forEach((o=>this.Xr.add(o.toString())))})).next((()=>r.removeTargetData(e,t)))}zr(){this.Yr=new Set}jr(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return C.forEach(this.Xr,(r=>{const s=O.fromPath(r);return this.ei(e,s).next((o=>{o||t.removeEntry(s,x.min())}))})).next((()=>(this.Yr=null,t.apply(e))))}updateLimboDocument(e,t){return this.ei(e,t).next((r=>{r?this.Xr.delete(t.toString()):this.Xr.add(t.toString())}))}Wr(e){return 0}ei(e,t){return C.or([()=>C.resolve(this.Jr.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Hr(e,t)])}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wi{constructor(e,t,r,s){this.targetId=e,this.fromCache=t,this.$i=r,this.Ui=s}static Wi(e,t){let r=L(),s=L();for(const o of t.docChanges)switch(o.type){case 0:r=r.add(o.doc.key);break;case 1:s=s.add(o.doc.key)}return new wi(e,t.fromCache,r,s)}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $m{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gm{constructor(){this.Gi=!1,this.zi=!1,this.ji=100,this.Hi=(function(){return bh()?8:Af(wh())>0?6:4})()}initialize(e,t){this.Ji=e,this.indexManager=t,this.Gi=!0}getDocumentsMatchingQuery(e,t,r,s){const o={result:null};return this.Yi(e,t).next((a=>{o.result=a})).next((()=>{if(!o.result)return this.Zi(e,t,s,r).next((a=>{o.result=a}))})).next((()=>{if(o.result)return;const a=new $m;return this.Xi(e,t,a).next((c=>{if(o.result=c,this.zi)return this.es(e,t,a,c.size)}))})).next((()=>o.result))}es(e,t,r,s){return r.documentReadCount<this.ji?(cn()<=z.DEBUG&&V("QueryEngine","SDK will not create cache indexes for query:",Pt(t),"since it only creates cache indexes for collection contains","more than or equal to",this.ji,"documents"),C.resolve()):(cn()<=z.DEBUG&&V("QueryEngine","Query:",Pt(t),"scans",r.documentReadCount,"local documents and returns",s,"documents as results."),r.documentReadCount>this.Hi*s?(cn()<=z.DEBUG&&V("QueryEngine","The SDK decides to create cache indexes for query:",Pt(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,Be(t))):C.resolve())}Yi(e,t){if(Ia(t))return C.resolve(null);let r=Be(t);return this.indexManager.getIndexType(e,r).next((s=>s===0?null:(t.limit!==null&&s===1&&(t=js(t,null,"F"),r=Be(t)),this.indexManager.getDocumentsMatchingTarget(e,r).next((o=>{const a=L(...o);return this.Ji.getDocuments(e,a).next((c=>this.indexManager.getMinOffset(e,r).next((h=>{const d=this.ts(t,c);return this.ns(t,d,a,h.readTime)?this.Yi(e,js(t,null,"F")):this.rs(e,d,t,h)}))))})))))}Zi(e,t,r,s){return Ia(t)||s.isEqual(x.min())?C.resolve(null):this.Ji.getDocuments(e,r).next((o=>{const a=this.ts(t,o);return this.ns(t,a,r,s)?C.resolve(null):(cn()<=z.DEBUG&&V("QueryEngine","Re-using previous result from %s to execute query: %s",s.toString(),Pt(t)),this.rs(e,a,t,vf(s,-1)).next((c=>c)))}))}ts(e,t){let r=new ue(tc(e));return t.forEach(((s,o)=>{Dr(e,o)&&(r=r.add(o))})),r}ns(e,t,r,s){if(e.limit===null)return!1;if(r.size!==t.size)return!0;const o=e.limitType==="F"?t.last():t.first();return!!o&&(o.hasPendingWrites||o.version.compareTo(s)>0)}Xi(e,t,r){return cn()<=z.DEBUG&&V("QueryEngine","Using full collection scan to execute query:",Pt(t)),this.Ji.getDocumentsMatchingQuery(e,t,it.min(),r)}rs(e,t,r,s){return this.Ji.getDocumentsMatchingQuery(e,r,s).next((o=>(t.forEach((a=>{o=o.insert(a.key,a)})),o)))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Km{constructor(e,t,r,s){this.persistence=e,this.ss=t,this.serializer=s,this.os=new J(q),this._s=new jt((o=>fi(o)),mi),this.us=new Map,this.cs=e.getRemoteDocumentCache(),this.Ur=e.getTargetCache(),this.Gr=e.getBundleCache(),this.ls(r)}ls(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new Nm(this.cs,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.cs.setIndexManager(this.indexManager),this.ss.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",(t=>e.collect(t,this.os)))}}function Hm(n,e,t,r){return new Km(n,e,t,r)}async function Ac(n,e){const t=F(n);return await t.persistence.runTransaction("Handle user change","readonly",(r=>{let s;return t.mutationQueue.getAllMutationBatches(r).next((o=>(s=o,t.ls(e),t.mutationQueue.getAllMutationBatches(r)))).next((o=>{const a=[],c=[];let h=L();for(const d of s){a.push(d.batchId);for(const m of d.mutations)h=h.add(m.key)}for(const d of o){c.push(d.batchId);for(const m of d.mutations)h=h.add(m.key)}return t.localDocuments.getDocuments(r,h).next((d=>({hs:d,removedBatchIds:a,addedBatchIds:c})))}))}))}function Wm(n,e){const t=F(n);return t.persistence.runTransaction("Acknowledge batch","readwrite-primary",(r=>{const s=e.batch.keys(),o=t.cs.newChangeBuffer({trackRemovals:!0});return(function(c,h,d,m){const w=d.batch,A=w.keys();let b=C.resolve();return A.forEach((k=>{b=b.next((()=>m.getEntry(h,k))).next((N=>{const D=d.docVersions.get(k);G(D!==null),N.version.compareTo(D)<0&&(w.applyToRemoteDocument(N,d),N.isValidDocument()&&(N.setReadTime(d.commitVersion),m.addEntry(N)))}))})),b.next((()=>c.mutationQueue.removeMutationBatch(h,w)))})(t,r,e,o).next((()=>o.apply(r))).next((()=>t.mutationQueue.performConsistencyCheck(r))).next((()=>t.documentOverlayCache.removeOverlaysForBatchId(r,s,e.batch.batchId))).next((()=>t.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(r,(function(c){let h=L();for(let d=0;d<c.mutationResults.length;++d)c.mutationResults[d].transformResults.length>0&&(h=h.add(c.batch.mutations[d].key));return h})(e)))).next((()=>t.localDocuments.getDocuments(r,s)))}))}function Ic(n){const e=F(n);return e.persistence.runTransaction("Get last remote snapshot version","readonly",(t=>e.Ur.getLastRemoteSnapshotVersion(t)))}function Qm(n,e){const t=F(n),r=e.snapshotVersion;let s=t.os;return t.persistence.runTransaction("Apply remote event","readwrite-primary",(o=>{const a=t.cs.newChangeBuffer({trackRemovals:!0});s=t.os;const c=[];e.targetChanges.forEach(((m,w)=>{const A=s.get(w);if(!A)return;c.push(t.Ur.removeMatchingKeys(o,m.removedDocuments,w).next((()=>t.Ur.addMatchingKeys(o,m.addedDocuments,w))));let b=A.withSequenceNumber(o.currentSequenceNumber);e.targetMismatches.get(w)!==null?b=b.withResumeToken(he.EMPTY_BYTE_STRING,x.min()).withLastLimboFreeSnapshotVersion(x.min()):m.resumeToken.approximateByteSize()>0&&(b=b.withResumeToken(m.resumeToken,r)),s=s.insert(w,b),(function(N,D,K){return N.resumeToken.approximateByteSize()===0||D.snapshotVersion.toMicroseconds()-N.snapshotVersion.toMicroseconds()>=3e8?!0:K.addedDocuments.size+K.modifiedDocuments.size+K.removedDocuments.size>0})(A,b,m)&&c.push(t.Ur.updateTargetData(o,b))}));let h=We(),d=L();if(e.documentUpdates.forEach((m=>{e.resolvedLimboDocuments.has(m)&&c.push(t.persistence.referenceDelegate.updateLimboDocument(o,m))})),c.push(Ym(o,a,e.documentUpdates).next((m=>{h=m.Ps,d=m.Is}))),!r.isEqual(x.min())){const m=t.Ur.getLastRemoteSnapshotVersion(o).next((w=>t.Ur.setTargetsMetadata(o,o.currentSequenceNumber,r)));c.push(m)}return C.waitFor(c).next((()=>a.apply(o))).next((()=>t.localDocuments.getLocalViewOfDocuments(o,h,d))).next((()=>h))})).then((o=>(t.os=s,o)))}function Ym(n,e,t){let r=L(),s=L();return t.forEach((o=>r=r.add(o))),e.getEntries(n,r).next((o=>{let a=We();return t.forEach(((c,h)=>{const d=o.get(c);h.isFoundDocument()!==d.isFoundDocument()&&(s=s.add(c)),h.isNoDocument()&&h.version.isEqual(x.min())?(e.removeEntry(c,h.readTime),a=a.insert(c,h)):!d.isValidDocument()||h.version.compareTo(d.version)>0||h.version.compareTo(d.version)===0&&d.hasPendingWrites?(e.addEntry(h),a=a.insert(c,h)):V("LocalStore","Ignoring outdated watch update for ",c,". Current version:",d.version," Watch version:",h.version)})),{Ps:a,Is:s}}))}function Xm(n,e){const t=F(n);return t.persistence.runTransaction("Get next mutation batch","readonly",(r=>(e===void 0&&(e=-1),t.mutationQueue.getNextMutationBatchAfterBatchId(r,e))))}function Jm(n,e){const t=F(n);return t.persistence.runTransaction("Allocate target","readwrite",(r=>{let s;return t.Ur.getTargetData(r,e).next((o=>o?(s=o,C.resolve(s)):t.Ur.allocateTargetId(r).next((a=>(s=new et(e,a,"TargetPurposeListen",r.currentSequenceNumber),t.Ur.addTargetData(r,s).next((()=>s)))))))})).then((r=>{const s=t.os.get(r.targetId);return(s===null||r.snapshotVersion.compareTo(s.snapshotVersion)>0)&&(t.os=t.os.insert(r.targetId,r),t._s.set(e,r.targetId)),r}))}async function Hs(n,e,t){const r=F(n),s=r.os.get(e),o=t?"readwrite":"readwrite-primary";try{t||await r.persistence.runTransaction("Release target",o,(a=>r.persistence.referenceDelegate.removeTarget(a,s)))}catch(a){if(!kn(a))throw a;V("LocalStore",`Failed to update sequence numbers for target ${e}: ${a}`)}r.os=r.os.remove(e),r._s.delete(s.target)}function Ma(n,e,t){const r=F(n);let s=x.min(),o=L();return r.persistence.runTransaction("Execute query","readwrite",(a=>(function(h,d,m){const w=F(h),A=w._s.get(m);return A!==void 0?C.resolve(w.os.get(A)):w.Ur.getTargetData(d,m)})(r,a,Be(e)).next((c=>{if(c)return s=c.lastLimboFreeSnapshotVersion,r.Ur.getMatchingKeysForTargetId(a,c.targetId).next((h=>{o=h}))})).next((()=>r.ss.getDocumentsMatchingQuery(a,e,t?s:x.min(),t?o:L()))).next((c=>(Zm(r,qf(e),c),{documents:c,Ts:o})))))}function Zm(n,e,t){let r=n.us.get(e)||x.min();t.forEach(((s,o)=>{o.readTime.compareTo(r)>0&&(r=o.readTime)})),n.us.set(e,r)}class xa{constructor(){this.activeTargetIds=Qf()}fs(e){this.activeTargetIds=this.activeTargetIds.add(e)}gs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}Vs(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class eg{constructor(){this.so=new xa,this.oo={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,r){}addLocalQueryTarget(e,t=!0){return t&&this.so.fs(e),this.oo[e]||"not-current"}updateQueryState(e,t,r){this.oo[e]=t}removeLocalQueryTarget(e){this.so.gs(e)}isLocalQueryTarget(e){return this.so.activeTargetIds.has(e)}clearQueryState(e){delete this.oo[e]}getAllActiveQueryTargets(){return this.so.activeTargetIds}isActiveQueryTarget(e){return this.so.activeTargetIds.has(e)}start(){return this.so=new xa,Promise.resolve()}handleUserChange(e,t,r){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class tg{_o(e){}shutdown(){}}/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fa{constructor(){this.ao=()=>this.uo(),this.co=()=>this.lo(),this.ho=[],this.Po()}_o(e){this.ho.push(e)}shutdown(){window.removeEventListener("online",this.ao),window.removeEventListener("offline",this.co)}Po(){window.addEventListener("online",this.ao),window.addEventListener("offline",this.co)}uo(){V("ConnectivityMonitor","Network connectivity changed: AVAILABLE");for(const e of this.ho)e(0)}lo(){V("ConnectivityMonitor","Network connectivity changed: UNAVAILABLE");for(const e of this.ho)e(1)}static D(){return typeof window<"u"&&window.addEventListener!==void 0&&window.removeEventListener!==void 0}}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ir=null;function As(){return ir===null?ir=(function(){return 268435456+Math.round(2147483648*Math.random())})():ir++,"0x"+ir.toString(16)}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ng={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class rg{constructor(e){this.Io=e.Io,this.To=e.To}Eo(e){this.Ao=e}Ro(e){this.Vo=e}mo(e){this.fo=e}onMessage(e){this.po=e}close(){this.To()}send(e){this.Io(e)}yo(){this.Ao()}wo(){this.Vo()}So(e){this.fo(e)}bo(e){this.po(e)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ge="WebChannelConnection";class sg extends class{constructor(t){this.databaseInfo=t,this.databaseId=t.databaseId;const r=t.ssl?"https":"http",s=encodeURIComponent(this.databaseId.projectId),o=encodeURIComponent(this.databaseId.database);this.Do=r+"://"+t.host,this.vo=`projects/${s}/databases/${o}`,this.Co=this.databaseId.database==="(default)"?`project_id=${s}`:`project_id=${s}&database_id=${o}`}get Fo(){return!1}Mo(t,r,s,o,a){const c=As(),h=this.xo(t,r.toUriEncodedString());V("RestConnection",`Sending RPC '${t}' ${c}:`,h,s);const d={"google-cloud-resource-prefix":this.vo,"x-goog-request-params":this.Co};return this.Oo(d,o,a),this.No(t,h,d,s).then((m=>(V("RestConnection",`Received RPC '${t}' ${c}: `,m),m)),(m=>{throw Nt("RestConnection",`RPC '${t}' ${c} failed with error: `,m,"url: ",h,"request:",s),m}))}Lo(t,r,s,o,a,c){return this.Mo(t,r,s,o,a)}Oo(t,r,s){t["X-Goog-Api-Client"]=(function(){return"gl-js/ fire/"+zt})(),t["Content-Type"]="text/plain",this.databaseInfo.appId&&(t["X-Firebase-GMPID"]=this.databaseInfo.appId),r&&r.headers.forEach(((o,a)=>t[a]=o)),s&&s.headers.forEach(((o,a)=>t[a]=o))}xo(t,r){const s=ng[t];return`${this.Do}/v1/${r}:${s}`}terminate(){}}{constructor(e){super(e),this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}No(e,t,r,s){const o=As();return new Promise(((a,c)=>{const h=new Fl;h.setWithCredentials(!0),h.listenOnce(Ll.COMPLETE,(()=>{try{switch(h.getLastErrorCode()){case ar.NO_ERROR:const m=h.getResponseJson();V(ge,`XHR for RPC '${e}' ${o} received:`,JSON.stringify(m)),a(m);break;case ar.TIMEOUT:V(ge,`RPC '${e}' ${o} timed out`),c(new B(S.DEADLINE_EXCEEDED,"Request time out"));break;case ar.HTTP_ERROR:const w=h.getStatus();if(V(ge,`RPC '${e}' ${o} failed with status:`,w,"response text:",h.getResponseText()),w>0){let A=h.getResponseJson();Array.isArray(A)&&(A=A[0]);const b=A==null?void 0:A.error;if(b&&b.status&&b.message){const k=(function(D){const K=D.toLowerCase().replace(/_/g,"-");return Object.values(S).indexOf(K)>=0?K:S.UNKNOWN})(b.status);c(new B(k,b.message))}else c(new B(S.UNKNOWN,"Server responded with status "+h.getStatus()))}else c(new B(S.UNAVAILABLE,"Connection failed."));break;default:M()}}finally{V(ge,`RPC '${e}' ${o} completed.`)}}));const d=JSON.stringify(s);V(ge,`RPC '${e}' ${o} sending request:`,s),h.send(t,"POST",d,r,15)}))}Bo(e,t,r){const s=As(),o=[this.Do,"/","google.firestore.v1.Firestore","/",e,"/channel"],a=jl(),c=zl(),h={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},d=this.longPollingOptions.timeoutSeconds;d!==void 0&&(h.longPollingTimeout=Math.round(1e3*d)),this.useFetchStreams&&(h.useFetchStreams=!0),this.Oo(h.initMessageHeaders,t,r),h.encodeInitMessageHeaders=!0;const m=o.join("");V(ge,`Creating RPC '${e}' stream ${s}: ${m}`,h);const w=a.createWebChannel(m,h);let A=!1,b=!1;const k=new rg({Io:D=>{b?V(ge,`Not sending because RPC '${e}' stream ${s} is closed:`,D):(A||(V(ge,`Opening RPC '${e}' stream ${s} transport.`),w.open(),A=!0),V(ge,`RPC '${e}' stream ${s} sending:`,D),w.send(D))},To:()=>w.close()}),N=(D,K,H)=>{D.listen(K,(Q=>{try{H(Q)}catch(re){setTimeout((()=>{throw re}),0)}}))};return N(w,un.EventType.OPEN,(()=>{b||(V(ge,`RPC '${e}' stream ${s} transport opened.`),k.yo())})),N(w,un.EventType.CLOSE,(()=>{b||(b=!0,V(ge,`RPC '${e}' stream ${s} transport closed`),k.So())})),N(w,un.EventType.ERROR,(D=>{b||(b=!0,Nt(ge,`RPC '${e}' stream ${s} transport errored:`,D),k.So(new B(S.UNAVAILABLE,"The operation could not be completed")))})),N(w,un.EventType.MESSAGE,(D=>{var K;if(!b){const H=D.data[0];G(!!H);const Q=H,re=Q.error||((K=Q[0])===null||K===void 0?void 0:K.error);if(re){V(ge,`RPC '${e}' stream ${s} received error:`,re);const Le=re.status;let oe=(function(p){const y=te[p];if(y!==void 0)return fc(y)})(Le),E=re.message;oe===void 0&&(oe=S.INTERNAL,E="Unknown error status: "+Le+" with message "+re.message),b=!0,k.So(new B(oe,E)),w.close()}else V(ge,`RPC '${e}' stream ${s} received:`,H),k.bo(H)}})),N(c,Ul.STAT_EVENT,(D=>{D.stat===xs.PROXY?V(ge,`RPC '${e}' stream ${s} detected buffering proxy`):D.stat===xs.NOPROXY&&V(ge,`RPC '${e}' stream ${s} detected no buffering proxy`)})),setTimeout((()=>{k.wo()}),0),k}}function Is(){return typeof document<"u"?document:null}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Nr(n){return new fm(n,!0)}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bc{constructor(e,t,r=1e3,s=1.5,o=6e4){this.ui=e,this.timerId=t,this.ko=r,this.qo=s,this.Qo=o,this.Ko=0,this.$o=null,this.Uo=Date.now(),this.reset()}reset(){this.Ko=0}Wo(){this.Ko=this.Qo}Go(e){this.cancel();const t=Math.floor(this.Ko+this.zo()),r=Math.max(0,Date.now()-this.Uo),s=Math.max(0,t-r);s>0&&V("ExponentialBackoff",`Backing off for ${s} ms (base delay: ${this.Ko} ms, delay with jitter: ${t} ms, last attempt: ${r} ms ago)`),this.$o=this.ui.enqueueAfterDelay(this.timerId,s,(()=>(this.Uo=Date.now(),e()))),this.Ko*=this.qo,this.Ko<this.ko&&(this.Ko=this.ko),this.Ko>this.Qo&&(this.Ko=this.Qo)}jo(){this.$o!==null&&(this.$o.skipDelay(),this.$o=null)}cancel(){this.$o!==null&&(this.$o.cancel(),this.$o=null)}zo(){return(Math.random()-.5)*this.Ko}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Sc{constructor(e,t,r,s,o,a,c,h){this.ui=e,this.Ho=r,this.Jo=s,this.connection=o,this.authCredentialsProvider=a,this.appCheckCredentialsProvider=c,this.listener=h,this.state=0,this.Yo=0,this.Zo=null,this.Xo=null,this.stream=null,this.e_=0,this.t_=new bc(e,t)}n_(){return this.state===1||this.state===5||this.r_()}r_(){return this.state===2||this.state===3}start(){this.e_=0,this.state!==4?this.auth():this.i_()}async stop(){this.n_()&&await this.close(0)}s_(){this.state=0,this.t_.reset()}o_(){this.r_()&&this.Zo===null&&(this.Zo=this.ui.enqueueAfterDelay(this.Ho,6e4,(()=>this.__())))}a_(e){this.u_(),this.stream.send(e)}async __(){if(this.r_())return this.close(0)}u_(){this.Zo&&(this.Zo.cancel(),this.Zo=null)}c_(){this.Xo&&(this.Xo.cancel(),this.Xo=null)}async close(e,t){this.u_(),this.c_(),this.t_.cancel(),this.Yo++,e!==4?this.t_.reset():t&&t.code===S.RESOURCE_EXHAUSTED?(He(t.toString()),He("Using maximum backoff delay to prevent overloading the backend."),this.t_.Wo()):t&&t.code===S.UNAUTHENTICATED&&this.state!==3&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),this.stream!==null&&(this.l_(),this.stream.close(),this.stream=null),this.state=e,await this.listener.mo(t)}l_(){}auth(){this.state=1;const e=this.h_(this.Yo),t=this.Yo;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then((([r,s])=>{this.Yo===t&&this.P_(r,s)}),(r=>{e((()=>{const s=new B(S.UNKNOWN,"Fetching auth token failed: "+r.message);return this.I_(s)}))}))}P_(e,t){const r=this.h_(this.Yo);this.stream=this.T_(e,t),this.stream.Eo((()=>{r((()=>this.listener.Eo()))})),this.stream.Ro((()=>{r((()=>(this.state=2,this.Xo=this.ui.enqueueAfterDelay(this.Jo,1e4,(()=>(this.r_()&&(this.state=3),Promise.resolve()))),this.listener.Ro())))})),this.stream.mo((s=>{r((()=>this.I_(s)))})),this.stream.onMessage((s=>{r((()=>++this.e_==1?this.E_(s):this.onNext(s)))}))}i_(){this.state=5,this.t_.Go((async()=>{this.state=0,this.start()}))}I_(e){return V("PersistentStream",`close with error: ${e}`),this.stream=null,this.close(4,e)}h_(e){return t=>{this.ui.enqueueAndForget((()=>this.Yo===e?t():(V("PersistentStream","stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve())))}}}class ig extends Sc{constructor(e,t,r,s,o,a){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,r,s,a),this.serializer=o}T_(e,t){return this.connection.Bo("Listen",e,t)}E_(e){return this.onNext(e)}onNext(e){this.t_.reset();const t=pm(this.serializer,e),r=(function(o){if(!("targetChange"in o))return x.min();const a=o.targetChange;return a.targetIds&&a.targetIds.length?x.min():a.readTime?Oe(a.readTime):x.min()})(e);return this.listener.d_(t,r)}A_(e){const t={};t.database=Ks(this.serializer),t.addTarget=(function(o,a){let c;const h=a.target;if(c=zs(h)?{documents:Em(o,h)}:{query:Tm(o,h)._t},c.targetId=a.targetId,a.resumeToken.approximateByteSize()>0){c.resumeToken=pc(o,a.resumeToken);const d=qs(o,a.expectedCount);d!==null&&(c.expectedCount=d)}else if(a.snapshotVersion.compareTo(x.min())>0){c.readTime=vr(o,a.snapshotVersion.toTimestamp());const d=qs(o,a.expectedCount);d!==null&&(c.expectedCount=d)}return c})(this.serializer,e);const r=wm(this.serializer,e);r&&(t.labels=r),this.a_(t)}R_(e){const t={};t.database=Ks(this.serializer),t.removeTarget=e,this.a_(t)}}class og extends Sc{constructor(e,t,r,s,o,a){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,r,s,a),this.serializer=o}get V_(){return this.e_>0}start(){this.lastStreamToken=void 0,super.start()}l_(){this.V_&&this.m_([])}T_(e,t){return this.connection.Bo("Write",e,t)}E_(e){return G(!!e.streamToken),this.lastStreamToken=e.streamToken,G(!e.writeResults||e.writeResults.length===0),this.listener.f_()}onNext(e){G(!!e.streamToken),this.lastStreamToken=e.streamToken,this.t_.reset();const t=vm(e.writeResults,e.commitTime),r=Oe(e.commitTime);return this.listener.g_(r,t)}p_(){const e={};e.database=Ks(this.serializer),this.a_(e)}m_(e){const t={streamToken:this.lastStreamToken,writes:e.map((r=>ym(this.serializer,r)))};this.a_(t)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ag extends class{}{constructor(e,t,r,s){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=r,this.serializer=s,this.y_=!1}w_(){if(this.y_)throw new B(S.FAILED_PRECONDITION,"The client has already been terminated.")}Mo(e,t,r,s){return this.w_(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then((([o,a])=>this.connection.Mo(e,$s(t,r),s,o,a))).catch((o=>{throw o.name==="FirebaseError"?(o.code===S.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),o):new B(S.UNKNOWN,o.toString())}))}Lo(e,t,r,s,o){return this.w_(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then((([a,c])=>this.connection.Lo(e,$s(t,r),s,a,c,o))).catch((a=>{throw a.name==="FirebaseError"?(a.code===S.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),a):new B(S.UNKNOWN,a.toString())}))}terminate(){this.y_=!0,this.connection.terminate()}}class lg{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.S_=0,this.b_=null,this.D_=!0}v_(){this.S_===0&&(this.C_("Unknown"),this.b_=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,(()=>(this.b_=null,this.F_("Backend didn't respond within 10 seconds."),this.C_("Offline"),Promise.resolve()))))}M_(e){this.state==="Online"?this.C_("Unknown"):(this.S_++,this.S_>=1&&(this.x_(),this.F_(`Connection failed 1 times. Most recent error: ${e.toString()}`),this.C_("Offline")))}set(e){this.x_(),this.S_=0,e==="Online"&&(this.D_=!1),this.C_(e)}C_(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}F_(e){const t=`Could not reach Cloud Firestore backend. ${e}
This typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.D_?(He(t),this.D_=!1):V("OnlineStateTracker",t)}x_(){this.b_!==null&&(this.b_.cancel(),this.b_=null)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class cg{constructor(e,t,r,s,o){this.localStore=e,this.datastore=t,this.asyncQueue=r,this.remoteSyncer={},this.O_=[],this.N_=new Map,this.L_=new Set,this.B_=[],this.k_=o,this.k_._o((a=>{r.enqueueAndForget((async()=>{At(this)&&(V("RemoteStore","Restarting streams for network reachability change."),await(async function(h){const d=F(h);d.L_.add(4),await Nn(d),d.q_.set("Unknown"),d.L_.delete(4),await Or(d)})(this))}))})),this.q_=new lg(r,s)}}async function Or(n){if(At(n))for(const e of n.B_)await e(!0)}async function Nn(n){for(const e of n.B_)await e(!1)}function Cc(n,e){const t=F(n);t.N_.has(e.targetId)||(t.N_.set(e.targetId,e),Si(t)?bi(t):qt(t).r_()&&Ii(t,e))}function Ai(n,e){const t=F(n),r=qt(t);t.N_.delete(e),r.r_()&&Pc(t,e),t.N_.size===0&&(r.r_()?r.o_():At(t)&&t.q_.set("Unknown"))}function Ii(n,e){if(n.Q_.xe(e.targetId),e.resumeToken.approximateByteSize()>0||e.snapshotVersion.compareTo(x.min())>0){const t=n.remoteSyncer.getRemoteKeysForTarget(e.targetId).size;e=e.withExpectedCount(t)}qt(n).A_(e)}function Pc(n,e){n.Q_.xe(e),qt(n).R_(e)}function bi(n){n.Q_=new um({getRemoteKeysForTarget:e=>n.remoteSyncer.getRemoteKeysForTarget(e),ot:e=>n.N_.get(e)||null,tt:()=>n.datastore.serializer.databaseId}),qt(n).start(),n.q_.v_()}function Si(n){return At(n)&&!qt(n).n_()&&n.N_.size>0}function At(n){return F(n).L_.size===0}function Dc(n){n.Q_=void 0}async function ug(n){n.q_.set("Online")}async function hg(n){n.N_.forEach(((e,t)=>{Ii(n,e)}))}async function dg(n,e){Dc(n),Si(n)?(n.q_.M_(e),bi(n)):n.q_.set("Unknown")}async function _g(n,e,t){if(n.q_.set("Online"),e instanceof gc&&e.state===2&&e.cause)try{await(async function(s,o){const a=o.cause;for(const c of o.targetIds)s.N_.has(c)&&(await s.remoteSyncer.rejectListen(c,a),s.N_.delete(c),s.Q_.removeTarget(c))})(n,e)}catch(r){V("RemoteStore","Failed to remove targets %s: %s ",e.targetIds.join(","),r),await Er(n,r)}else if(e instanceof ur?n.Q_.Ke(e):e instanceof mc?n.Q_.He(e):n.Q_.We(e),!t.isEqual(x.min()))try{const r=await Ic(n.localStore);t.compareTo(r)>=0&&await(function(o,a){const c=o.Q_.rt(a);return c.targetChanges.forEach(((h,d)=>{if(h.resumeToken.approximateByteSize()>0){const m=o.N_.get(d);m&&o.N_.set(d,m.withResumeToken(h.resumeToken,a))}})),c.targetMismatches.forEach(((h,d)=>{const m=o.N_.get(h);if(!m)return;o.N_.set(h,m.withResumeToken(he.EMPTY_BYTE_STRING,m.snapshotVersion)),Pc(o,h);const w=new et(m.target,h,d,m.sequenceNumber);Ii(o,w)})),o.remoteSyncer.applyRemoteEvent(c)})(n,t)}catch(r){V("RemoteStore","Failed to raise snapshot:",r),await Er(n,r)}}async function Er(n,e,t){if(!kn(e))throw e;n.L_.add(1),await Nn(n),n.q_.set("Offline"),t||(t=()=>Ic(n.localStore)),n.asyncQueue.enqueueRetryable((async()=>{V("RemoteStore","Retrying IndexedDB access"),await t(),n.L_.delete(1),await Or(n)}))}function kc(n,e){return e().catch((t=>Er(n,t,e)))}async function Mr(n){const e=F(n),t=at(e);let r=e.O_.length>0?e.O_[e.O_.length-1].batchId:-1;for(;fg(e);)try{const s=await Xm(e.localStore,r);if(s===null){e.O_.length===0&&t.o_();break}r=s.batchId,mg(e,s)}catch(s){await Er(e,s)}Vc(e)&&Bc(e)}function fg(n){return At(n)&&n.O_.length<10}function mg(n,e){n.O_.push(e);const t=at(n);t.r_()&&t.V_&&t.m_(e.mutations)}function Vc(n){return At(n)&&!at(n).n_()&&n.O_.length>0}function Bc(n){at(n).start()}async function gg(n){at(n).p_()}async function pg(n){const e=at(n);for(const t of n.O_)e.m_(t.mutations)}async function yg(n,e,t){const r=n.O_.shift(),s=yi.from(r,e,t);await kc(n,(()=>n.remoteSyncer.applySuccessfulWrite(s))),await Mr(n)}async function vg(n,e){e&&at(n).V_&&await(async function(r,s){if((function(a){return am(a)&&a!==S.ABORTED})(s.code)){const o=r.O_.shift();at(r).s_(),await kc(r,(()=>r.remoteSyncer.rejectFailedWrite(o.batchId,s))),await Mr(r)}})(n,e),Vc(n)&&Bc(n)}async function La(n,e){const t=F(n);t.asyncQueue.verifyOperationInProgress(),V("RemoteStore","RemoteStore received new credentials");const r=At(t);t.L_.add(3),await Nn(t),r&&t.q_.set("Unknown"),await t.remoteSyncer.handleCredentialChange(e),t.L_.delete(3),await Or(t)}async function Eg(n,e){const t=F(n);e?(t.L_.delete(2),await Or(t)):e||(t.L_.add(2),await Nn(t),t.q_.set("Unknown"))}function qt(n){return n.K_||(n.K_=(function(t,r,s){const o=F(t);return o.w_(),new ig(r,o.connection,o.authCredentials,o.appCheckCredentials,o.serializer,s)})(n.datastore,n.asyncQueue,{Eo:ug.bind(null,n),Ro:hg.bind(null,n),mo:dg.bind(null,n),d_:_g.bind(null,n)}),n.B_.push((async e=>{e?(n.K_.s_(),Si(n)?bi(n):n.q_.set("Unknown")):(await n.K_.stop(),Dc(n))}))),n.K_}function at(n){return n.U_||(n.U_=(function(t,r,s){const o=F(t);return o.w_(),new og(r,o.connection,o.authCredentials,o.appCheckCredentials,o.serializer,s)})(n.datastore,n.asyncQueue,{Eo:()=>Promise.resolve(),Ro:gg.bind(null,n),mo:vg.bind(null,n),f_:pg.bind(null,n),g_:yg.bind(null,n)}),n.B_.push((async e=>{e?(n.U_.s_(),await Mr(n)):(await n.U_.stop(),n.O_.length>0&&(V("RemoteStore",`Stopping write stream with ${n.O_.length} pending writes`),n.O_=[]))}))),n.U_}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ci{constructor(e,t,r,s,o){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=r,this.op=s,this.removalCallback=o,this.deferred=new qe,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch((a=>{}))}get promise(){return this.deferred.promise}static createAndSchedule(e,t,r,s,o){const a=Date.now()+r,c=new Ci(e,t,a,s,o);return c.start(r),c}start(e){this.timerHandle=setTimeout((()=>this.handleDelayElapsed()),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){this.timerHandle!==null&&(this.clearTimeout(),this.deferred.reject(new B(S.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget((()=>this.timerHandle!==null?(this.clearTimeout(),this.op().then((e=>this.deferred.resolve(e)))):Promise.resolve()))}clearTimeout(){this.timerHandle!==null&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Pi(n,e){if(He("AsyncQueue",`${e}: ${n}`),kn(n))return new B(S.UNAVAILABLE,`${e}: ${n}`);throw n}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bt{constructor(e){this.comparator=e?(t,r)=>e(t,r)||O.comparator(t.key,r.key):(t,r)=>O.comparator(t.key,r.key),this.keyedMap=hn(),this.sortedSet=new J(this.comparator)}static emptySet(e){return new Bt(e.comparator)}has(e){return this.keyedMap.get(e)!=null}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal(((t,r)=>(e(t),!1)))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof Bt)||this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),r=e.sortedSet.getIterator();for(;t.hasNext();){const s=t.getNext().key,o=r.getNext().key;if(!s.isEqual(o))return!1}return!0}toString(){const e=[];return this.forEach((t=>{e.push(t.toString())})),e.length===0?"DocumentSet ()":`DocumentSet (
  `+e.join(`  
`)+`
)`}copy(e,t){const r=new Bt;return r.comparator=this.comparator,r.keyedMap=e,r.sortedSet=t,r}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ua{constructor(){this.W_=new J(O.comparator)}track(e){const t=e.doc.key,r=this.W_.get(t);r?e.type!==0&&r.type===3?this.W_=this.W_.insert(t,e):e.type===3&&r.type!==1?this.W_=this.W_.insert(t,{type:r.type,doc:e.doc}):e.type===2&&r.type===2?this.W_=this.W_.insert(t,{type:2,doc:e.doc}):e.type===2&&r.type===0?this.W_=this.W_.insert(t,{type:0,doc:e.doc}):e.type===1&&r.type===0?this.W_=this.W_.remove(t):e.type===1&&r.type===2?this.W_=this.W_.insert(t,{type:1,doc:r.doc}):e.type===0&&r.type===1?this.W_=this.W_.insert(t,{type:2,doc:e.doc}):M():this.W_=this.W_.insert(t,e)}G_(){const e=[];return this.W_.inorderTraversal(((t,r)=>{e.push(r)})),e}}class Lt{constructor(e,t,r,s,o,a,c,h,d){this.query=e,this.docs=t,this.oldDocs=r,this.docChanges=s,this.mutatedKeys=o,this.fromCache=a,this.syncStateChanged=c,this.excludesMetadataChanges=h,this.hasCachedResults=d}static fromInitialDocuments(e,t,r,s,o){const a=[];return t.forEach((c=>{a.push({type:0,doc:c})})),new Lt(e,t,Bt.emptySet(t),a,r,s,!0,!1,o)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&Pr(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,r=e.docChanges;if(t.length!==r.length)return!1;for(let s=0;s<t.length;s++)if(t[s].type!==r[s].type||!t[s].doc.isEqual(r[s].doc))return!1;return!0}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Tg{constructor(){this.z_=void 0,this.j_=[]}H_(){return this.j_.some((e=>e.J_()))}}class Rg{constructor(){this.queries=za(),this.onlineState="Unknown",this.Y_=new Set}terminate(){(function(t,r){const s=F(t),o=s.queries;s.queries=za(),o.forEach(((a,c)=>{for(const h of c.j_)h.onError(r)}))})(this,new B(S.ABORTED,"Firestore shutting down"))}}function za(){return new jt((n=>ec(n)),Pr)}async function Nc(n,e){const t=F(n);let r=3;const s=e.query;let o=t.queries.get(s);o?!o.H_()&&e.J_()&&(r=2):(o=new Tg,r=e.J_()?0:1);try{switch(r){case 0:o.z_=await t.onListen(s,!0);break;case 1:o.z_=await t.onListen(s,!1);break;case 2:await t.onFirstRemoteStoreListen(s)}}catch(a){const c=Pi(a,`Initialization of query '${Pt(e.query)}' failed`);return void e.onError(c)}t.queries.set(s,o),o.j_.push(e),e.Z_(t.onlineState),o.z_&&e.X_(o.z_)&&Di(t)}async function Oc(n,e){const t=F(n),r=e.query;let s=3;const o=t.queries.get(r);if(o){const a=o.j_.indexOf(e);a>=0&&(o.j_.splice(a,1),o.j_.length===0?s=e.J_()?0:1:!o.H_()&&e.J_()&&(s=2))}switch(s){case 0:return t.queries.delete(r),t.onUnlisten(r,!0);case 1:return t.queries.delete(r),t.onUnlisten(r,!1);case 2:return t.onLastRemoteStoreUnlisten(r);default:return}}function wg(n,e){const t=F(n);let r=!1;for(const s of e){const o=s.query,a=t.queries.get(o);if(a){for(const c of a.j_)c.X_(s)&&(r=!0);a.z_=s}}r&&Di(t)}function Ag(n,e,t){const r=F(n),s=r.queries.get(e);if(s)for(const o of s.j_)o.onError(t);r.queries.delete(e)}function Di(n){n.Y_.forEach((e=>{e.next()}))}var Ws,ja;(ja=Ws||(Ws={})).ea="default",ja.Cache="cache";class Mc{constructor(e,t,r){this.query=e,this.ta=t,this.na=!1,this.ra=null,this.onlineState="Unknown",this.options=r||{}}X_(e){if(!this.options.includeMetadataChanges){const r=[];for(const s of e.docChanges)s.type!==3&&r.push(s);e=new Lt(e.query,e.docs,e.oldDocs,r,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.na?this.ia(e)&&(this.ta.next(e),t=!0):this.sa(e,this.onlineState)&&(this.oa(e),t=!0),this.ra=e,t}onError(e){this.ta.error(e)}Z_(e){this.onlineState=e;let t=!1;return this.ra&&!this.na&&this.sa(this.ra,e)&&(this.oa(this.ra),t=!0),t}sa(e,t){if(!e.fromCache||!this.J_())return!0;const r=t!=="Offline";return(!this.options._a||!r)&&(!e.docs.isEmpty()||e.hasCachedResults||t==="Offline")}ia(e){if(e.docChanges.length>0)return!0;const t=this.ra&&this.ra.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&this.options.includeMetadataChanges===!0}oa(e){e=Lt.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.na=!0,this.ta.next(e)}J_(){return this.options.source!==Ws.Cache}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class xc{constructor(e){this.key=e}}class Fc{constructor(e){this.key=e}}class Ig{constructor(e,t){this.query=e,this.Ta=t,this.Ea=null,this.hasCachedResults=!1,this.current=!1,this.da=L(),this.mutatedKeys=L(),this.Aa=tc(e),this.Ra=new Bt(this.Aa)}get Va(){return this.Ta}ma(e,t){const r=t?t.fa:new Ua,s=t?t.Ra:this.Ra;let o=t?t.mutatedKeys:this.mutatedKeys,a=s,c=!1;const h=this.query.limitType==="F"&&s.size===this.query.limit?s.last():null,d=this.query.limitType==="L"&&s.size===this.query.limit?s.first():null;if(e.inorderTraversal(((m,w)=>{const A=s.get(m),b=Dr(this.query,w)?w:null,k=!!A&&this.mutatedKeys.has(A.key),N=!!b&&(b.hasLocalMutations||this.mutatedKeys.has(b.key)&&b.hasCommittedMutations);let D=!1;A&&b?A.data.isEqual(b.data)?k!==N&&(r.track({type:3,doc:b}),D=!0):this.ga(A,b)||(r.track({type:2,doc:b}),D=!0,(h&&this.Aa(b,h)>0||d&&this.Aa(b,d)<0)&&(c=!0)):!A&&b?(r.track({type:0,doc:b}),D=!0):A&&!b&&(r.track({type:1,doc:A}),D=!0,(h||d)&&(c=!0)),D&&(b?(a=a.add(b),o=N?o.add(m):o.delete(m)):(a=a.delete(m),o=o.delete(m)))})),this.query.limit!==null)for(;a.size>this.query.limit;){const m=this.query.limitType==="F"?a.last():a.first();a=a.delete(m.key),o=o.delete(m.key),r.track({type:1,doc:m})}return{Ra:a,fa:r,ns:c,mutatedKeys:o}}ga(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,r,s){const o=this.Ra;this.Ra=e.Ra,this.mutatedKeys=e.mutatedKeys;const a=e.fa.G_();a.sort(((m,w)=>(function(b,k){const N=D=>{switch(D){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return M()}};return N(b)-N(k)})(m.type,w.type)||this.Aa(m.doc,w.doc))),this.pa(r),s=s!=null&&s;const c=t&&!s?this.ya():[],h=this.da.size===0&&this.current&&!s?1:0,d=h!==this.Ea;return this.Ea=h,a.length!==0||d?{snapshot:new Lt(this.query,e.Ra,o,a,e.mutatedKeys,h===0,d,!1,!!r&&r.resumeToken.approximateByteSize()>0),wa:c}:{wa:c}}Z_(e){return this.current&&e==="Offline"?(this.current=!1,this.applyChanges({Ra:this.Ra,fa:new Ua,mutatedKeys:this.mutatedKeys,ns:!1},!1)):{wa:[]}}Sa(e){return!this.Ta.has(e)&&!!this.Ra.has(e)&&!this.Ra.get(e).hasLocalMutations}pa(e){e&&(e.addedDocuments.forEach((t=>this.Ta=this.Ta.add(t))),e.modifiedDocuments.forEach((t=>{})),e.removedDocuments.forEach((t=>this.Ta=this.Ta.delete(t))),this.current=e.current)}ya(){if(!this.current)return[];const e=this.da;this.da=L(),this.Ra.forEach((r=>{this.Sa(r.key)&&(this.da=this.da.add(r.key))}));const t=[];return e.forEach((r=>{this.da.has(r)||t.push(new Fc(r))})),this.da.forEach((r=>{e.has(r)||t.push(new xc(r))})),t}ba(e){this.Ta=e.Ts,this.da=L();const t=this.ma(e.documents);return this.applyChanges(t,!0)}Da(){return Lt.fromInitialDocuments(this.query,this.Ra,this.mutatedKeys,this.Ea===0,this.hasCachedResults)}}class bg{constructor(e,t,r){this.query=e,this.targetId=t,this.view=r}}class Sg{constructor(e){this.key=e,this.va=!1}}class Cg{constructor(e,t,r,s,o,a){this.localStore=e,this.remoteStore=t,this.eventManager=r,this.sharedClientState=s,this.currentUser=o,this.maxConcurrentLimboResolutions=a,this.Ca={},this.Fa=new jt((c=>ec(c)),Pr),this.Ma=new Map,this.xa=new Set,this.Oa=new J(O.comparator),this.Na=new Map,this.La=new Ti,this.Ba={},this.ka=new Map,this.qa=Ft.kn(),this.onlineState="Unknown",this.Qa=void 0}get isPrimaryClient(){return this.Qa===!0}}async function Pg(n,e,t=!0){const r=$c(n);let s;const o=r.Fa.get(e);return o?(r.sharedClientState.addLocalQueryTarget(o.targetId),s=o.view.Da()):s=await Lc(r,e,t,!0),s}async function Dg(n,e){const t=$c(n);await Lc(t,e,!0,!1)}async function Lc(n,e,t,r){const s=await Jm(n.localStore,Be(e)),o=s.targetId,a=n.sharedClientState.addLocalQueryTarget(o,t);let c;return r&&(c=await kg(n,e,o,a==="current",s.resumeToken)),n.isPrimaryClient&&t&&Cc(n.remoteStore,s),c}async function kg(n,e,t,r,s){n.Ka=(w,A,b)=>(async function(N,D,K,H){let Q=D.view.ma(K);Q.ns&&(Q=await Ma(N.localStore,D.query,!1).then((({documents:E})=>D.view.ma(E,Q))));const re=H&&H.targetChanges.get(D.targetId),Le=H&&H.targetMismatches.get(D.targetId)!=null,oe=D.view.applyChanges(Q,N.isPrimaryClient,re,Le);return $a(N,D.targetId,oe.wa),oe.snapshot})(n,w,A,b);const o=await Ma(n.localStore,e,!0),a=new Ig(e,o.Ts),c=a.ma(o.documents),h=Bn.createSynthesizedTargetChangeForCurrentChange(t,r&&n.onlineState!=="Offline",s),d=a.applyChanges(c,n.isPrimaryClient,h);$a(n,t,d.wa);const m=new bg(e,t,a);return n.Fa.set(e,m),n.Ma.has(t)?n.Ma.get(t).push(e):n.Ma.set(t,[e]),d.snapshot}async function Vg(n,e,t){const r=F(n),s=r.Fa.get(e),o=r.Ma.get(s.targetId);if(o.length>1)return r.Ma.set(s.targetId,o.filter((a=>!Pr(a,e)))),void r.Fa.delete(e);r.isPrimaryClient?(r.sharedClientState.removeLocalQueryTarget(s.targetId),r.sharedClientState.isActiveQueryTarget(s.targetId)||await Hs(r.localStore,s.targetId,!1).then((()=>{r.sharedClientState.clearQueryState(s.targetId),t&&Ai(r.remoteStore,s.targetId),Qs(r,s.targetId)})).catch(Dn)):(Qs(r,s.targetId),await Hs(r.localStore,s.targetId,!0))}async function Bg(n,e){const t=F(n),r=t.Fa.get(e),s=t.Ma.get(r.targetId);t.isPrimaryClient&&s.length===1&&(t.sharedClientState.removeLocalQueryTarget(r.targetId),Ai(t.remoteStore,r.targetId))}async function Ng(n,e,t){const r=zg(n);try{const s=await(function(a,c){const h=F(a),d=$.now(),m=c.reduce(((b,k)=>b.add(k.key)),L());let w,A;return h.persistence.runTransaction("Locally write mutations","readwrite",(b=>{let k=We(),N=L();return h.cs.getEntries(b,m).next((D=>{k=D,k.forEach(((K,H)=>{H.isValidDocument()||(N=N.add(K))}))})).next((()=>h.localDocuments.getOverlayedDocuments(b,k))).next((D=>{w=D;const K=[];for(const H of c){const Q=nm(H,w.get(H.key).overlayedDocument);Q!=null&&K.push(new ct(H.key,Q,Hl(Q.value.mapValue),Ne.exists(!0)))}return h.mutationQueue.addMutationBatch(b,d,K,c)})).next((D=>{A=D;const K=D.applyToLocalDocumentSet(w,N);return h.documentOverlayCache.saveOverlays(b,D.batchId,K)}))})).then((()=>({batchId:A.batchId,changes:rc(w)})))})(r.localStore,e);r.sharedClientState.addPendingMutation(s.batchId),(function(a,c,h){let d=a.Ba[a.currentUser.toKey()];d||(d=new J(q)),d=d.insert(c,h),a.Ba[a.currentUser.toKey()]=d})(r,s.batchId,t),await On(r,s.changes),await Mr(r.remoteStore)}catch(s){const o=Pi(s,"Failed to persist write");t.reject(o)}}async function Uc(n,e){const t=F(n);try{const r=await Qm(t.localStore,e);e.targetChanges.forEach(((s,o)=>{const a=t.Na.get(o);a&&(G(s.addedDocuments.size+s.modifiedDocuments.size+s.removedDocuments.size<=1),s.addedDocuments.size>0?a.va=!0:s.modifiedDocuments.size>0?G(a.va):s.removedDocuments.size>0&&(G(a.va),a.va=!1))})),await On(t,r,e)}catch(r){await Dn(r)}}function qa(n,e,t){const r=F(n);if(r.isPrimaryClient&&t===0||!r.isPrimaryClient&&t===1){const s=[];r.Fa.forEach(((o,a)=>{const c=a.view.Z_(e);c.snapshot&&s.push(c.snapshot)})),(function(a,c){const h=F(a);h.onlineState=c;let d=!1;h.queries.forEach(((m,w)=>{for(const A of w.j_)A.Z_(c)&&(d=!0)})),d&&Di(h)})(r.eventManager,e),s.length&&r.Ca.d_(s),r.onlineState=e,r.isPrimaryClient&&r.sharedClientState.setOnlineState(e)}}async function Og(n,e,t){const r=F(n);r.sharedClientState.updateQueryState(e,"rejected",t);const s=r.Na.get(e),o=s&&s.key;if(o){let a=new J(O.comparator);a=a.insert(o,ye.newNoDocument(o,x.min()));const c=L().add(o),h=new Br(x.min(),new Map,new J(q),a,c);await Uc(r,h),r.Oa=r.Oa.remove(o),r.Na.delete(e),ki(r)}else await Hs(r.localStore,e,!1).then((()=>Qs(r,e,t))).catch(Dn)}async function Mg(n,e){const t=F(n),r=e.batch.batchId;try{const s=await Wm(t.localStore,e);jc(t,r,null),zc(t,r),t.sharedClientState.updateMutationState(r,"acknowledged"),await On(t,s)}catch(s){await Dn(s)}}async function xg(n,e,t){const r=F(n);try{const s=await(function(a,c){const h=F(a);return h.persistence.runTransaction("Reject batch","readwrite-primary",(d=>{let m;return h.mutationQueue.lookupMutationBatch(d,c).next((w=>(G(w!==null),m=w.keys(),h.mutationQueue.removeMutationBatch(d,w)))).next((()=>h.mutationQueue.performConsistencyCheck(d))).next((()=>h.documentOverlayCache.removeOverlaysForBatchId(d,m,c))).next((()=>h.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(d,m))).next((()=>h.localDocuments.getDocuments(d,m)))}))})(r.localStore,e);jc(r,e,t),zc(r,e),r.sharedClientState.updateMutationState(e,"rejected",t),await On(r,s)}catch(s){await Dn(s)}}function zc(n,e){(n.ka.get(e)||[]).forEach((t=>{t.resolve()})),n.ka.delete(e)}function jc(n,e,t){const r=F(n);let s=r.Ba[r.currentUser.toKey()];if(s){const o=s.get(e);o&&(t?o.reject(t):o.resolve(),s=s.remove(e)),r.Ba[r.currentUser.toKey()]=s}}function Qs(n,e,t=null){n.sharedClientState.removeLocalQueryTarget(e);for(const r of n.Ma.get(e))n.Fa.delete(r),t&&n.Ca.$a(r,t);n.Ma.delete(e),n.isPrimaryClient&&n.La.gr(e).forEach((r=>{n.La.containsKey(r)||qc(n,r)}))}function qc(n,e){n.xa.delete(e.path.canonicalString());const t=n.Oa.get(e);t!==null&&(Ai(n.remoteStore,t),n.Oa=n.Oa.remove(e),n.Na.delete(t),ki(n))}function $a(n,e,t){for(const r of t)r instanceof xc?(n.La.addReference(r.key,e),Fg(n,r)):r instanceof Fc?(V("SyncEngine","Document no longer in limbo: "+r.key),n.La.removeReference(r.key,e),n.La.containsKey(r.key)||qc(n,r.key)):M()}function Fg(n,e){const t=e.key,r=t.path.canonicalString();n.Oa.get(t)||n.xa.has(r)||(V("SyncEngine","New document in limbo: "+t),n.xa.add(r),ki(n))}function ki(n){for(;n.xa.size>0&&n.Oa.size<n.maxConcurrentLimboResolutions;){const e=n.xa.values().next().value;n.xa.delete(e);const t=new O(X.fromString(e)),r=n.qa.next();n.Na.set(r,new Sg(t)),n.Oa=n.Oa.insert(t,r),Cc(n.remoteStore,new et(Be(gi(t.path)),r,"TargetPurposeLimboResolution",ui.oe))}}async function On(n,e,t){const r=F(n),s=[],o=[],a=[];r.Fa.isEmpty()||(r.Fa.forEach(((c,h)=>{a.push(r.Ka(h,e,t).then((d=>{var m;if((d||t)&&r.isPrimaryClient){const w=d?!d.fromCache:(m=t==null?void 0:t.targetChanges.get(h.targetId))===null||m===void 0?void 0:m.current;r.sharedClientState.updateQueryState(h.targetId,w?"current":"not-current")}if(d){s.push(d);const w=wi.Wi(h.targetId,d);o.push(w)}})))})),await Promise.all(a),r.Ca.d_(s),await(async function(h,d){const m=F(h);try{await m.persistence.runTransaction("notifyLocalViewChanges","readwrite",(w=>C.forEach(d,(A=>C.forEach(A.$i,(b=>m.persistence.referenceDelegate.addReference(w,A.targetId,b))).next((()=>C.forEach(A.Ui,(b=>m.persistence.referenceDelegate.removeReference(w,A.targetId,b)))))))))}catch(w){if(!kn(w))throw w;V("LocalStore","Failed to update sequence numbers: "+w)}for(const w of d){const A=w.targetId;if(!w.fromCache){const b=m.os.get(A),k=b.snapshotVersion,N=b.withLastLimboFreeSnapshotVersion(k);m.os=m.os.insert(A,N)}}})(r.localStore,o))}async function Lg(n,e){const t=F(n);if(!t.currentUser.isEqual(e)){V("SyncEngine","User change. New user:",e.toKey());const r=await Ac(t.localStore,e);t.currentUser=e,(function(o,a){o.ka.forEach((c=>{c.forEach((h=>{h.reject(new B(S.CANCELLED,a))}))})),o.ka.clear()})(t,"'waitForPendingWrites' promise is rejected due to a user change."),t.sharedClientState.handleUserChange(e,r.removedBatchIds,r.addedBatchIds),await On(t,r.hs)}}function Ug(n,e){const t=F(n),r=t.Na.get(e);if(r&&r.va)return L().add(r.key);{let s=L();const o=t.Ma.get(e);if(!o)return s;for(const a of o){const c=t.Fa.get(a);s=s.unionWith(c.view.Va)}return s}}function $c(n){const e=F(n);return e.remoteStore.remoteSyncer.applyRemoteEvent=Uc.bind(null,e),e.remoteStore.remoteSyncer.getRemoteKeysForTarget=Ug.bind(null,e),e.remoteStore.remoteSyncer.rejectListen=Og.bind(null,e),e.Ca.d_=wg.bind(null,e.eventManager),e.Ca.$a=Ag.bind(null,e.eventManager),e}function zg(n){const e=F(n);return e.remoteStore.remoteSyncer.applySuccessfulWrite=Mg.bind(null,e),e.remoteStore.remoteSyncer.rejectFailedWrite=xg.bind(null,e),e}class Tr{constructor(){this.kind="memory",this.synchronizeTabs=!1}async initialize(e){this.serializer=Nr(e.databaseInfo.databaseId),this.sharedClientState=this.Wa(e),this.persistence=this.Ga(e),await this.persistence.start(),this.localStore=this.za(e),this.gcScheduler=this.ja(e,this.localStore),this.indexBackfillerScheduler=this.Ha(e,this.localStore)}ja(e,t){return null}Ha(e,t){return null}za(e){return Hm(this.persistence,new Gm,e.initialUser,this.serializer)}Ga(e){return new jm(Ri.Zr,this.serializer)}Wa(e){return new eg}async terminate(){var e,t;(e=this.gcScheduler)===null||e===void 0||e.stop(),(t=this.indexBackfillerScheduler)===null||t===void 0||t.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}Tr.provider={build:()=>new Tr};class Ys{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=r=>qa(this.syncEngine,r,1),this.remoteStore.remoteSyncer.handleCredentialChange=Lg.bind(null,this.syncEngine),await Eg(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return(function(){return new Rg})()}createDatastore(e){const t=Nr(e.databaseInfo.databaseId),r=(function(o){return new sg(o)})(e.databaseInfo);return(function(o,a,c,h){return new ag(o,a,c,h)})(e.authCredentials,e.appCheckCredentials,r,t)}createRemoteStore(e){return(function(r,s,o,a,c){return new cg(r,s,o,a,c)})(this.localStore,this.datastore,e.asyncQueue,(t=>qa(this.syncEngine,t,0)),(function(){return Fa.D()?new Fa:new tg})())}createSyncEngine(e,t){return(function(s,o,a,c,h,d,m){const w=new Cg(s,o,a,c,h,d);return m&&(w.Qa=!0),w})(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){var e,t;await(async function(s){const o=F(s);V("RemoteStore","RemoteStore shutting down."),o.L_.add(5),await Nn(o),o.k_.shutdown(),o.q_.set("Unknown")})(this.remoteStore),(e=this.datastore)===null||e===void 0||e.terminate(),(t=this.eventManager)===null||t===void 0||t.terminate()}}Ys.provider={build:()=>new Ys};/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *//**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Gc{constructor(e){this.observer=e,this.muted=!1}next(e){this.muted||this.observer.next&&this.Ya(this.observer.next,e)}error(e){this.muted||(this.observer.error?this.Ya(this.observer.error,e):He("Uncaught Error in snapshot listener:",e.toString()))}Za(){this.muted=!0}Ya(e,t){setTimeout((()=>{this.muted||e(t)}),0)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jg{constructor(e,t,r,s,o){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=r,this.databaseInfo=s,this.user=pe.UNAUTHENTICATED,this.clientId=$l.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this._uninitializedComponentsProvider=o,this.authCredentials.start(r,(async a=>{V("FirestoreClient","Received user=",a.uid),await this.authCredentialListener(a),this.user=a})),this.appCheckCredentials.start(r,(a=>(V("FirestoreClient","Received new app check token=",a),this.appCheckCredentialListener(a,this.user))))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}terminate(){this.asyncQueue.enterRestrictedMode();const e=new qe;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted((async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const r=Pi(t,"Failed to shutdown persistence");e.reject(r)}})),e.promise}}async function bs(n,e){n.asyncQueue.verifyOperationInProgress(),V("FirestoreClient","Initializing OfflineComponentProvider");const t=n.configuration;await e.initialize(t);let r=t.initialUser;n.setCredentialChangeListener((async s=>{r.isEqual(s)||(await Ac(e.localStore,s),r=s)})),e.persistence.setDatabaseDeletedListener((()=>n.terminate())),n._offlineComponents=e}async function Ga(n,e){n.asyncQueue.verifyOperationInProgress();const t=await qg(n);V("FirestoreClient","Initializing OnlineComponentProvider"),await e.initialize(t,n.configuration),n.setCredentialChangeListener((r=>La(e.remoteStore,r))),n.setAppCheckTokenChangeListener(((r,s)=>La(e.remoteStore,s))),n._onlineComponents=e}async function qg(n){if(!n._offlineComponents)if(n._uninitializedComponentsProvider){V("FirestoreClient","Using user provided OfflineComponentProvider");try{await bs(n,n._uninitializedComponentsProvider._offline)}catch(e){const t=e;if(!(function(s){return s.name==="FirebaseError"?s.code===S.FAILED_PRECONDITION||s.code===S.UNIMPLEMENTED:!(typeof DOMException<"u"&&s instanceof DOMException)||s.code===22||s.code===20||s.code===11})(t))throw t;Nt("Error using user provided cache. Falling back to memory cache: "+t),await bs(n,new Tr)}}else V("FirestoreClient","Using default OfflineComponentProvider"),await bs(n,new Tr);return n._offlineComponents}async function Kc(n){return n._onlineComponents||(n._uninitializedComponentsProvider?(V("FirestoreClient","Using user provided OnlineComponentProvider"),await Ga(n,n._uninitializedComponentsProvider._online)):(V("FirestoreClient","Using default OnlineComponentProvider"),await Ga(n,new Ys))),n._onlineComponents}function $g(n){return Kc(n).then((e=>e.syncEngine))}async function Hc(n){const e=await Kc(n),t=e.eventManager;return t.onListen=Pg.bind(null,e.syncEngine),t.onUnlisten=Vg.bind(null,e.syncEngine),t.onFirstRemoteStoreListen=Dg.bind(null,e.syncEngine),t.onLastRemoteStoreUnlisten=Bg.bind(null,e.syncEngine),t}function Gg(n,e,t={}){const r=new qe;return n.asyncQueue.enqueueAndForget((async()=>(function(o,a,c,h,d){const m=new Gc({next:A=>{m.Za(),a.enqueueAndForget((()=>Oc(o,w)));const b=A.docs.has(c);!b&&A.fromCache?d.reject(new B(S.UNAVAILABLE,"Failed to get document because the client is offline.")):b&&A.fromCache&&h&&h.source==="server"?d.reject(new B(S.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):d.resolve(A)},error:A=>d.reject(A)}),w=new Mc(gi(c.path),m,{includeMetadataChanges:!0,_a:!0});return Nc(o,w)})(await Hc(n),n.asyncQueue,e,t,r))),r.promise}function Kg(n,e,t={}){const r=new qe;return n.asyncQueue.enqueueAndForget((async()=>(function(o,a,c,h,d){const m=new Gc({next:A=>{m.Za(),a.enqueueAndForget((()=>Oc(o,w))),A.fromCache&&h.source==="server"?d.reject(new B(S.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):d.resolve(A)},error:A=>d.reject(A)}),w=new Mc(c,m,{includeMetadataChanges:!0,_a:!0});return Nc(o,w)})(await Hc(n),n.asyncQueue,e,t,r))),r.promise}/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Wc(n){const e={};return n.timeoutSeconds!==void 0&&(e.timeoutSeconds=n.timeoutSeconds),e}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ka=new Map;/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Qc(n,e,t){if(!t)throw new B(S.INVALID_ARGUMENT,`Function ${n}() cannot be called with an empty ${e}.`)}function Hg(n,e,t,r){if(e===!0&&r===!0)throw new B(S.INVALID_ARGUMENT,`${n} and ${t} cannot be used together.`)}function Ha(n){if(!O.isDocumentKey(n))throw new B(S.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${n} has ${n.length}.`)}function Wa(n){if(O.isDocumentKey(n))throw new B(S.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${n} has ${n.length}.`)}function Vi(n){if(n===void 0)return"undefined";if(n===null)return"null";if(typeof n=="string")return n.length>20&&(n=`${n.substring(0,20)}...`),JSON.stringify(n);if(typeof n=="number"||typeof n=="boolean")return""+n;if(typeof n=="object"){if(n instanceof Array)return"an array";{const e=(function(r){return r.constructor?r.constructor.name:null})(n);return e?`a custom ${e} object`:"an object"}}return typeof n=="function"?"a function":M()}function Qe(n,e){if("_delegate"in n&&(n=n._delegate),!(n instanceof e)){if(e.name===n.constructor.name)throw new B(S.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const t=Vi(n);throw new B(S.INVALID_ARGUMENT,`Expected type '${e.name}', but it was: ${t}`)}}return n}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qa{constructor(e){var t,r;if(e.host===void 0){if(e.ssl!==void 0)throw new B(S.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host="firestore.googleapis.com",this.ssl=!0}else this.host=e.host,this.ssl=(t=e.ssl)===null||t===void 0||t;if(this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,e.cacheSizeBytes===void 0)this.cacheSizeBytes=41943040;else{if(e.cacheSizeBytes!==-1&&e.cacheSizeBytes<1048576)throw new B(S.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}Hg("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:e.experimentalAutoDetectLongPolling===void 0?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=Wc((r=e.experimentalLongPollingOptions)!==null&&r!==void 0?r:{}),(function(o){if(o.timeoutSeconds!==void 0){if(isNaN(o.timeoutSeconds))throw new B(S.INVALID_ARGUMENT,`invalid long polling timeout: ${o.timeoutSeconds} (must not be NaN)`);if(o.timeoutSeconds<5)throw new B(S.INVALID_ARGUMENT,`invalid long polling timeout: ${o.timeoutSeconds} (minimum allowed value is 5)`);if(o.timeoutSeconds>30)throw new B(S.INVALID_ARGUMENT,`invalid long polling timeout: ${o.timeoutSeconds} (maximum allowed value is 30)`)}})(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&(function(r,s){return r.timeoutSeconds===s.timeoutSeconds})(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class xr{constructor(e,t,r,s){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=r,this._app=s,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new Qa({}),this._settingsFrozen=!1,this._terminateTask="notTerminated"}get app(){if(!this._app)throw new B(S.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return this._terminateTask!=="notTerminated"}_setSettings(e){if(this._settingsFrozen)throw new B(S.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new Qa(e),e.credentials!==void 0&&(this._authCredentials=(function(r){if(!r)return new uf;switch(r.type){case"firstParty":return new ff(r.sessionIndex||"0",r.iamToken||null,r.authTokenFactory||null);case"provider":return r.client;default:throw new B(S.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}})(e.credentials))}_getSettings(){return this._settings}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask==="notTerminated"&&(this._terminateTask=this._terminate()),this._terminateTask}async _restart(){this._terminateTask==="notTerminated"?await this._terminate():this._terminateTask="notTerminated"}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return(function(t){const r=Ka.get(t);r&&(V("ComponentProvider","Removing Datastore"),Ka.delete(t),r.terminate())})(this),Promise.resolve()}}function Wg(n,e,t,r={}){var s;const o=(n=Qe(n,xr))._getSettings(),a=`${e}:${t}`;if(o.host!=="firestore.googleapis.com"&&o.host!==a&&Nt("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used."),n._setSettings(Object.assign(Object.assign({},o),{host:a,ssl:!1})),r.mockUserToken){let c,h;if(typeof r.mockUserToken=="string")c=r.mockUserToken,h=pe.MOCK_USER;else{c=Rh(r.mockUserToken,(s=n._app)===null||s===void 0?void 0:s.options.projectId);const d=r.mockUserToken.sub||r.mockUserToken.user_id;if(!d)throw new B(S.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");h=new pe(d)}n._authCredentials=new hf(new ql(c,h))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fr{constructor(e,t,r){this.converter=t,this._query=r,this.type="query",this.firestore=e}withConverter(e){return new Fr(this.firestore,e,this._query)}}class we{constructor(e,t,r){this.converter=t,this._key=r,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new rt(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new we(this.firestore,e,this._key)}}class rt extends Fr{constructor(e,t,r){super(e,t,gi(r)),this._path=r,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new we(this.firestore,null,new O(e))}withConverter(e){return new rt(this.firestore,e,this._path)}}function Pe(n,e,...t){if(n=$e(n),Qc("collection","path",e),n instanceof xr){const r=X.fromString(e,...t);return Wa(r),new rt(n,null,r)}{if(!(n instanceof we||n instanceof rt))throw new B(S.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=n._path.child(X.fromString(e,...t));return Wa(r),new rt(n.firestore,null,r)}}function Fe(n,e,...t){if(n=$e(n),arguments.length===1&&(e=$l.newId()),Qc("doc","path",e),n instanceof xr){const r=X.fromString(e,...t);return Ha(r),new we(n,null,new O(r))}{if(!(n instanceof we||n instanceof rt))throw new B(S.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=n._path.child(X.fromString(e,...t));return Ha(r),new we(n.firestore,n instanceof rt?n.converter:null,new O(r))}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ya{constructor(e=Promise.resolve()){this.Pu=[],this.Iu=!1,this.Tu=[],this.Eu=null,this.du=!1,this.Au=!1,this.Ru=[],this.t_=new bc(this,"async_queue_retry"),this.Vu=()=>{const r=Is();r&&V("AsyncQueue","Visibility state changed to "+r.visibilityState),this.t_.jo()},this.mu=e;const t=Is();t&&typeof t.addEventListener=="function"&&t.addEventListener("visibilitychange",this.Vu)}get isShuttingDown(){return this.Iu}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.fu(),this.gu(e)}enterRestrictedMode(e){if(!this.Iu){this.Iu=!0,this.Au=e||!1;const t=Is();t&&typeof t.removeEventListener=="function"&&t.removeEventListener("visibilitychange",this.Vu)}}enqueue(e){if(this.fu(),this.Iu)return new Promise((()=>{}));const t=new qe;return this.gu((()=>this.Iu&&this.Au?Promise.resolve():(e().then(t.resolve,t.reject),t.promise))).then((()=>t.promise))}enqueueRetryable(e){this.enqueueAndForget((()=>(this.Pu.push(e),this.pu())))}async pu(){if(this.Pu.length!==0){try{await this.Pu[0](),this.Pu.shift(),this.t_.reset()}catch(e){if(!kn(e))throw e;V("AsyncQueue","Operation failed with retryable error: "+e)}this.Pu.length>0&&this.t_.Go((()=>this.pu()))}}gu(e){const t=this.mu.then((()=>(this.du=!0,e().catch((r=>{this.Eu=r,this.du=!1;const s=(function(a){let c=a.message||"";return a.stack&&(c=a.stack.includes(a.message)?a.stack:a.message+`
`+a.stack),c})(r);throw He("INTERNAL UNHANDLED ERROR: ",s),r})).then((r=>(this.du=!1,r))))));return this.mu=t,t}enqueueAfterDelay(e,t,r){this.fu(),this.Ru.indexOf(e)>-1&&(t=0);const s=Ci.createAndSchedule(this,e,t,r,(o=>this.yu(o)));return this.Tu.push(s),s}fu(){this.Eu&&M()}verifyOperationInProgress(){}async wu(){let e;do e=this.mu,await e;while(e!==this.mu)}Su(e){for(const t of this.Tu)if(t.timerId===e)return!0;return!1}bu(e){return this.wu().then((()=>{this.Tu.sort(((t,r)=>t.targetTimeMs-r.targetTimeMs));for(const t of this.Tu)if(t.skipDelay(),e!=="all"&&t.timerId===e)break;return this.wu()}))}Du(e){this.Ru.push(e)}yu(e){const t=this.Tu.indexOf(e);this.Tu.splice(t,1)}}class Mn extends xr{constructor(e,t,r,s){super(e,t,r,s),this.type="firestore",this._queue=new Ya,this._persistenceKey=(s==null?void 0:s.name)||"[DEFAULT]"}async _terminate(){if(this._firestoreClient){const e=this._firestoreClient.terminate();this._queue=new Ya(e),this._firestoreClient=void 0,await e}}}function Qg(n,e){const t=typeof n=="object"?n:Bd(),r=typeof n=="string"?n:"(default)",s=ri(t,"firestore").getImmediate({identifier:r});if(!s._initialized){const o=Eh("firestore");o&&Wg(s,...o)}return s}function Bi(n){if(n._terminated)throw new B(S.FAILED_PRECONDITION,"The client has already been terminated.");return n._firestoreClient||Yg(n),n._firestoreClient}function Yg(n){var e,t,r;const s=n._freezeSettings(),o=(function(c,h,d,m){return new Sf(c,h,d,m.host,m.ssl,m.experimentalForceLongPolling,m.experimentalAutoDetectLongPolling,Wc(m.experimentalLongPollingOptions),m.useFetchStreams)})(n._databaseId,((e=n._app)===null||e===void 0?void 0:e.options.appId)||"",n._persistenceKey,s);n._componentsProvider||!((t=s.localCache)===null||t===void 0)&&t._offlineComponentProvider&&(!((r=s.localCache)===null||r===void 0)&&r._onlineComponentProvider)&&(n._componentsProvider={_offline:s.localCache._offlineComponentProvider,_online:s.localCache._onlineComponentProvider}),n._firestoreClient=new jg(n._authCredentials,n._appCheckCredentials,n._queue,o,n._componentsProvider&&(function(c){const h=c==null?void 0:c._online.build();return{_offline:c==null?void 0:c._offline.build(h),_online:h}})(n._componentsProvider))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ut{constructor(e){this._byteString=e}static fromBase64String(e){try{return new Ut(he.fromBase64String(e))}catch(t){throw new B(S.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+t)}}static fromUint8Array(e){return new Ut(he.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Lr{constructor(...e){for(let t=0;t<e.length;++t)if(e[t].length===0)throw new B(S.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new ce(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ur{constructor(e){this._methodName=e}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ni{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new B(S.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new B(S.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}toJSON(){return{latitude:this._lat,longitude:this._long}}_compareTo(e){return q(this._lat,e._lat)||q(this._long,e._long)}}/**
 * @license
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Oi{constructor(e){this._values=(e||[]).map((t=>t))}toArray(){return this._values.map((e=>e))}isEqual(e){return(function(r,s){if(r.length!==s.length)return!1;for(let o=0;o<r.length;++o)if(r[o]!==s[o])return!1;return!0})(this._values,e._values)}}/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Xg=/^__.*__$/;class Jg{constructor(e,t,r){this.data=e,this.fieldMask=t,this.fieldTransforms=r}toMutation(e,t){return this.fieldMask!==null?new ct(e,this.data,this.fieldMask,t,this.fieldTransforms):new Vn(e,this.data,t,this.fieldTransforms)}}class Yc{constructor(e,t,r){this.data=e,this.fieldMask=t,this.fieldTransforms=r}toMutation(e,t){return new ct(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function Xc(n){switch(n){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw M()}}class Mi{constructor(e,t,r,s,o,a){this.settings=e,this.databaseId=t,this.serializer=r,this.ignoreUndefinedProperties=s,o===void 0&&this.vu(),this.fieldTransforms=o||[],this.fieldMask=a||[]}get path(){return this.settings.path}get Cu(){return this.settings.Cu}Fu(e){return new Mi(Object.assign(Object.assign({},this.settings),e),this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}Mu(e){var t;const r=(t=this.path)===null||t===void 0?void 0:t.child(e),s=this.Fu({path:r,xu:!1});return s.Ou(e),s}Nu(e){var t;const r=(t=this.path)===null||t===void 0?void 0:t.child(e),s=this.Fu({path:r,xu:!1});return s.vu(),s}Lu(e){return this.Fu({path:void 0,xu:!0})}Bu(e){return Rr(e,this.settings.methodName,this.settings.ku||!1,this.path,this.settings.qu)}contains(e){return this.fieldMask.find((t=>e.isPrefixOf(t)))!==void 0||this.fieldTransforms.find((t=>e.isPrefixOf(t.field)))!==void 0}vu(){if(this.path)for(let e=0;e<this.path.length;e++)this.Ou(this.path.get(e))}Ou(e){if(e.length===0)throw this.Bu("Document fields must not be empty");if(Xc(this.Cu)&&Xg.test(e))throw this.Bu('Document fields cannot begin and end with "__"')}}class Zg{constructor(e,t,r){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=r||Nr(e)}Qu(e,t,r,s=!1){return new Mi({Cu:e,methodName:t,qu:r,path:ce.emptyPath(),xu:!1,ku:s},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function Jc(n){const e=n._freezeSettings(),t=Nr(n._databaseId);return new Zg(n._databaseId,!!e.ignoreUndefinedProperties,t)}function ep(n,e,t,r,s,o={}){const a=n.Qu(o.merge||o.mergeFields?2:0,e,t,s);Fi("Data must be an object, but it was:",a,r);const c=Zc(r,a);let h,d;if(o.merge)h=new Ie(a.fieldMask),d=a.fieldTransforms;else if(o.mergeFields){const m=[];for(const w of o.mergeFields){const A=Xs(e,w,t);if(!a.contains(A))throw new B(S.INVALID_ARGUMENT,`Field '${A}' is specified in your field mask but missing from your input data.`);tu(m,A)||m.push(A)}h=new Ie(m),d=a.fieldTransforms.filter((w=>h.covers(w.field)))}else h=null,d=a.fieldTransforms;return new Jg(new Te(c),h,d)}class zr extends Ur{_toFieldTransform(e){if(e.Cu!==2)throw e.Cu===1?e.Bu(`${this._methodName}() can only appear at the top level of your update data`):e.Bu(`${this._methodName}() cannot be used with set() unless you pass {merge:true}`);return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof zr}}class xi extends Ur{constructor(e,t){super(e),this.$u=t}_toFieldTransform(e){const t=new Sn(e.serializer,oc(e.serializer,this.$u));return new Jf(e.path,t)}isEqual(e){return e instanceof xi&&this.$u===e.$u}}function tp(n,e,t,r){const s=n.Qu(1,e,t);Fi("Data must be an object, but it was:",s,r);const o=[],a=Te.empty();wt(r,((h,d)=>{const m=Li(e,h,t);d=$e(d);const w=s.Nu(m);if(d instanceof zr)o.push(m);else{const A=jr(d,w);A!=null&&(o.push(m),a.set(m,A))}}));const c=new Ie(o);return new Yc(a,c,s.fieldTransforms)}function np(n,e,t,r,s,o){const a=n.Qu(1,e,t),c=[Xs(e,r,t)],h=[s];if(o.length%2!=0)throw new B(S.INVALID_ARGUMENT,`Function ${e}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let A=0;A<o.length;A+=2)c.push(Xs(e,o[A])),h.push(o[A+1]);const d=[],m=Te.empty();for(let A=c.length-1;A>=0;--A)if(!tu(d,c[A])){const b=c[A];let k=h[A];k=$e(k);const N=a.Nu(b);if(k instanceof zr)d.push(b);else{const D=jr(k,N);D!=null&&(d.push(b),m.set(b,D))}}const w=new Ie(d);return new Yc(m,w,a.fieldTransforms)}function jr(n,e){if(eu(n=$e(n)))return Fi("Unsupported field value:",e,n),Zc(n,e);if(n instanceof Ur)return(function(r,s){if(!Xc(s.Cu))throw s.Bu(`${r._methodName}() can only be used with update() and set()`);if(!s.path)throw s.Bu(`${r._methodName}() is not currently supported inside arrays`);const o=r._toFieldTransform(s);o&&s.fieldTransforms.push(o)})(n,e),null;if(n===void 0&&e.ignoreUndefinedProperties)return null;if(e.path&&e.fieldMask.push(e.path),n instanceof Array){if(e.settings.xu&&e.Cu!==4)throw e.Bu("Nested arrays are not supported");return(function(r,s){const o=[];let a=0;for(const c of r){let h=jr(c,s.Lu(a));h==null&&(h={nullValue:"NULL_VALUE"}),o.push(h),a++}return{arrayValue:{values:o}}})(n,e)}return(function(r,s){if((r=$e(r))===null)return{nullValue:"NULL_VALUE"};if(typeof r=="number")return oc(s.serializer,r);if(typeof r=="boolean")return{booleanValue:r};if(typeof r=="string")return{stringValue:r};if(r instanceof Date){const o=$.fromDate(r);return{timestampValue:vr(s.serializer,o)}}if(r instanceof $){const o=new $(r.seconds,1e3*Math.floor(r.nanoseconds/1e3));return{timestampValue:vr(s.serializer,o)}}if(r instanceof Ni)return{geoPointValue:{latitude:r.latitude,longitude:r.longitude}};if(r instanceof Ut)return{bytesValue:pc(s.serializer,r._byteString)};if(r instanceof we){const o=s.databaseId,a=r.firestore._databaseId;if(!a.isEqual(o))throw s.Bu(`Document reference is for database ${a.projectId}/${a.database} but should be for database ${o.projectId}/${o.database}`);return{referenceValue:Ei(r.firestore._databaseId||s.databaseId,r._key.path)}}if(r instanceof Oi)return(function(a,c){return{mapValue:{fields:{__type__:{stringValue:"__vector__"},value:{arrayValue:{values:a.toArray().map((h=>{if(typeof h!="number")throw c.Bu("VectorValues must only contain numeric values.");return pi(c.serializer,h)}))}}}}}})(r,s);throw s.Bu(`Unsupported field value: ${Vi(r)}`)})(n,e)}function Zc(n,e){const t={};return Gl(n)?e.path&&e.path.length>0&&e.fieldMask.push(e.path):wt(n,((r,s)=>{const o=jr(s,e.Mu(r));o!=null&&(t[r]=o)})),{mapValue:{fields:t}}}function eu(n){return!(typeof n!="object"||n===null||n instanceof Array||n instanceof Date||n instanceof $||n instanceof Ni||n instanceof Ut||n instanceof we||n instanceof Ur||n instanceof Oi)}function Fi(n,e,t){if(!eu(t)||!(function(s){return typeof s=="object"&&s!==null&&(Object.getPrototypeOf(s)===Object.prototype||Object.getPrototypeOf(s)===null)})(t)){const r=Vi(t);throw r==="an object"?e.Bu(n+" a custom object"):e.Bu(n+" "+r)}}function Xs(n,e,t){if((e=$e(e))instanceof Lr)return e._internalPath;if(typeof e=="string")return Li(n,e);throw Rr("Field path arguments must be of type string or ",n,!1,void 0,t)}const rp=new RegExp("[~\\*/\\[\\]]");function Li(n,e,t){if(e.search(rp)>=0)throw Rr(`Invalid field path (${e}). Paths must not contain '~', '*', '/', '[', or ']'`,n,!1,void 0,t);try{return new Lr(...e.split("."))._internalPath}catch{throw Rr(`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,n,!1,void 0,t)}}function Rr(n,e,t,r,s){const o=r&&!r.isEmpty(),a=s!==void 0;let c=`Function ${e}() called with invalid data`;t&&(c+=" (via `toFirestore()`)"),c+=". ";let h="";return(o||a)&&(h+=" (found",o&&(h+=` in field ${r}`),a&&(h+=` in document ${s}`),h+=")"),new B(S.INVALID_ARGUMENT,c+n+h)}function tu(n,e){return n.some((t=>t.isEqual(e)))}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class nu{constructor(e,t,r,s,o){this._firestore=e,this._userDataWriter=t,this._key=r,this._document=s,this._converter=o}get id(){return this._key.path.lastSegment()}get ref(){return new we(this._firestore,this._converter,this._key)}exists(){return this._document!==null}data(){if(this._document){if(this._converter){const e=new sp(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const t=this._document.data.field(ru("DocumentSnapshot.get",e));if(t!==null)return this._userDataWriter.convertValue(t)}}}class sp extends nu{data(){return super.data()}}function ru(n,e){return typeof e=="string"?Li(n,e):e instanceof Lr?e._internalPath:e._delegate._internalPath}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ip(n){if(n.limitType==="L"&&n.explicitOrderBy.length===0)throw new B(S.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class op{convertValue(e,t="none"){switch(Rt(e)){case 0:return null;case 1:return e.booleanValue;case 2:return ee(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(Tt(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 11:return this.convertObject(e.mapValue,t);case 10:return this.convertVectorValue(e.mapValue);default:throw M()}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const r={};return wt(e,((s,o)=>{r[s]=this.convertValue(o,t)})),r}convertVectorValue(e){var t,r,s;const o=(s=(r=(t=e.fields)===null||t===void 0?void 0:t.value.arrayValue)===null||r===void 0?void 0:r.values)===null||s===void 0?void 0:s.map((a=>ee(a.doubleValue)));return new Oi(o)}convertGeoPoint(e){return new Ni(ee(e.latitude),ee(e.longitude))}convertArray(e,t){return(e.values||[]).map((r=>this.convertValue(r,t)))}convertServerTimestamp(e,t){switch(t){case"previous":const r=di(e);return r==null?null:this.convertValue(r,t);case"estimate":return this.convertTimestamp(Rn(e));default:return null}}convertTimestamp(e){const t=ot(e);return new $(t.seconds,t.nanos)}convertDocumentKey(e,t){const r=X.fromString(e);G(wc(r));const s=new wn(r.get(1),r.get(3)),o=new O(r.popFirst(5));return s.isEqual(t)||He(`Document ${o} contains a document reference within a different database (${s.projectId}/${s.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),o}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ap(n,e,t){let r;return r=n?n.toFirestore(e):e,r}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _n{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class su extends nu{constructor(e,t,r,s,o,a){super(e,t,r,s,a),this._firestore=e,this._firestoreImpl=e,this.metadata=o}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new hr(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const r=this._document.data.field(ru("DocumentSnapshot.get",e));if(r!==null)return this._userDataWriter.convertValue(r,t.serverTimestamps)}}}class hr extends su{data(e={}){return super.data(e)}}class lp{constructor(e,t,r,s){this._firestore=e,this._userDataWriter=t,this._snapshot=s,this.metadata=new _n(s.hasPendingWrites,s.fromCache),this.query=r}get docs(){const e=[];return this.forEach((t=>e.push(t))),e}get size(){return this._snapshot.docs.size}get empty(){return this.size===0}forEach(e,t){this._snapshot.docs.forEach((r=>{e.call(t,new hr(this._firestore,this._userDataWriter,r.key,r,new _n(this._snapshot.mutatedKeys.has(r.key),this._snapshot.fromCache),this.query.converter))}))}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new B(S.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=(function(s,o){if(s._snapshot.oldDocs.isEmpty()){let a=0;return s._snapshot.docChanges.map((c=>{const h=new hr(s._firestore,s._userDataWriter,c.doc.key,c.doc,new _n(s._snapshot.mutatedKeys.has(c.doc.key),s._snapshot.fromCache),s.query.converter);return c.doc,{type:"added",doc:h,oldIndex:-1,newIndex:a++}}))}{let a=s._snapshot.oldDocs;return s._snapshot.docChanges.filter((c=>o||c.type!==3)).map((c=>{const h=new hr(s._firestore,s._userDataWriter,c.doc.key,c.doc,new _n(s._snapshot.mutatedKeys.has(c.doc.key),s._snapshot.fromCache),s.query.converter);let d=-1,m=-1;return c.type!==0&&(d=a.indexOf(c.doc.key),a=a.delete(c.doc.key)),c.type!==1&&(a=a.add(c.doc),m=a.indexOf(c.doc.key)),{type:cp(c.type),doc:h,oldIndex:d,newIndex:m}}))}})(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}}function cp(n){switch(n){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return M()}}/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function iu(n){n=Qe(n,we);const e=Qe(n.firestore,Mn);return Gg(Bi(e),n._key).then((t=>up(e,n,t)))}class ou extends op{constructor(e){super(),this.firestore=e}convertBytes(e){return new Ut(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new we(this.firestore,null,t)}}function au(n){n=Qe(n,Fr);const e=Qe(n.firestore,Mn),t=Bi(e),r=new ou(e);return ip(n._query),Kg(t,n._query).then((s=>new lp(e,r,n,s)))}function Cn(n,e,t){n=Qe(n,we);const r=Qe(n.firestore,Mn),s=ap(n.converter,e);return lu(r,[ep(Jc(r),"setDoc",n._key,s,n.converter!==null,t).toMutation(n._key,Ne.none())])}function Ui(n,e,t,...r){n=Qe(n,we);const s=Qe(n.firestore,Mn),o=Jc(s);let a;return a=typeof(e=$e(e))=="string"||e instanceof Lr?np(o,"updateDoc",n._key,e,t,r):tp(o,"updateDoc",n._key,e),lu(s,[a.toMutation(n._key,Ne.exists(!0))])}function lu(n,e){return(function(r,s){const o=new qe;return r.asyncQueue.enqueueAndForget((async()=>Ng(await $g(r),s,o))),o.promise})(Bi(n),e)}function up(n,e,t){const r=t.docs.get(e._key),s=new ou(n);return new su(n,s,e._key,r,new _n(t.hasPendingWrites,t.fromCache),e.converter)}function hp(n){return new xi("increment",n)}(function(e,t=!0){(function(s){zt=s})(Vd),st(new Ge("firestore",((r,{instanceIdentifier:s,options:o})=>{const a=r.getProvider("app").getImmediate(),c=new Mn(new df(r.getProvider("auth-internal")),new gf(r.getProvider("app-check-internal")),(function(d,m){if(!Object.prototype.hasOwnProperty.apply(d.options,["projectId"]))throw new B(S.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new wn(d.options.projectId,m)})(a,s),a);return o=Object.assign({useFetchStreams:t},o),c._setSettings(o),c}),"PUBLIC").setMultipleInstances(!0)),Ve(ma,"4.7.3",e),Ve(ma,"4.7.3","esm2017")})();const dp={apiKey:"REDACTED_API_KEY",authDomain:"REDACTED_PROJECT_ID.firebaseapp.com",projectId:"REDACTED_PROJECT_ID",storageBucket:"REDACTED_PROJECT_ID.appspot.com",messagingSenderId:"REDACTED_SENDER_ID",appId:"1:REDACTED_SENDER_ID:web:c76c1f46364a8a072fb655",measurementId:"REDACTED_MEASUREMENT_ID"};let Xa,be;Nd().length||(Xa=dl(dp),be=Qg(Xa));const _p=async()=>{const n=Fe(Pe(be,"Global"),"totalusers");try{await Ui(n,{count:hp(1)}),console.log("Count incremented")}catch(e){console.error("Error adding document: ",e)}},fp=async()=>{const n=Fe(Pe(be,"Global"),"totalusers");try{let t=(await iu(n)).data().count;return console.log("Count retrieved"),t}catch(e){console.error("Error adding document: ",e)}return 0},mp=async(n,e)=>{const t={earnings:0,ordersComplete:0,uniqueSetsComplete:0,createdAt:$.fromDate(new Date),updatedAt:$.fromDate(new Date),configuration:e},r=Fe(Pe(be,"Users"),n);try{await Cn(r,t),console.log("Document written with ID: ",n)}catch(a){console.error("Error adding document: ",a)}const s=Fe(Pe(be,"Users/"+n+"/Actions"),"start"),o={createdAt:$.fromDate(new Date),updatedAt:$.fromDate(new Date),earnings:0,ordersComplete:0,uniqueSetsComplete:0,gametime:0};try{await Cn(s,o),console.log("Start action written with id ",n)}catch(a){console.error("Error creating actions collection: ",a)}return n};function gp(n){let e=0;for(let t=0;t<n.length;t++)e=(e*31+n.charCodeAt(t))%2147483647;return e}function pp(n){let e=n%2147483647;return e<=0&&(e+=2147483646),function(){return e=e*16807%2147483647,(e-1)/2147483646}}function Ja(n){switch(n){case 10:return"A";case 11:return"B";case 12:return"C";case 13:return"D";case 14:return"E";case 15:return"F";default:return n}}function or(n,e){const t=[];for(let o=0;o<3;o++)t.push(Math.floor(n()*16));let r=0;for(let o=0;o<t.length;o++){let a=t[o];o==1&&(a*=2,a>15&&(a-=15)),r+=a,t[o]=Ja(a)}const s=Ja((16-r%16+e)%16);return t.push(s),t.join("")}function cu(n){const e=gp(n),t=pp(e);let r=or(t,11),s=or(t,0),o=or(t,11),a=or(t,10);return r+"-"+s+"-"+o+"-"+a}const Kp=n=>{let e=n+"qq";return cu(e)},yp=async(n,e)=>{const t=Fe(Pe(be,"Auth"),n),r=await iu(t);if(r.exists())return console.log("Retrieved user with token",e),console.log(r.data()),r.data().status==2?1:0;let s=cu(n);if(console.log("Generated token vs token"),console.log(s),console.log(e),s==e){const o={userid:n,status:1},a=Fe(Pe(be,"Auth"),e);try{await Cn(a,o),console.log("Document written with ID: ",e)}catch(c){console.error("Error adding document: ",c)}return 1}else return 0},vp=async(n,e,t)=>{const r=Fe(Pe(be,"Users/"+n+"/Actions"),t);e.createdAt=$.fromDate(new Date),e.updatedAt=$.fromDate(new Date),e.userID=n;try{await Cn(r,e),console.log("Start action written with id ",n)}catch(s){console.error("Error creating actions collection: ",s)}return n},Ep=async(n,e,t)=>{const r=Fe(Pe(be,"Users/"+n+"/Orders"),t);e.createdAt=$.fromDate(new Date),e.updatedAt=$.fromDate(new Date),e.userID=n;try{await Cn(r,e),console.log("Added an order with ",n)}catch(s){console.error("Error adding order: ",s)}return n},Tp=async(n,e,t)=>{const r=Fe(Pe(be,"Users/"+n+"/Orders"),t);e.updatedAt=$.fromDate(new Date);try{await Ui(r,e),console.log("Document updated with id: ",n)}catch(s){console.error("Error updating document: ",s)}return n},uu=async(n,e)=>{const t=Fe(Pe(be,"Users"),n);e.updatedAt=$.fromDate(new Date);try{await Ui(t,e),console.log("Document updated with id: , id")}catch(r){console.error("Error updating document: ",r)}return n};async function Za(n,e){return(await au(Pe(be,"Users/"+n+e))).docs.map(s=>({id:s.id,...s.data()}))}const Hp=async()=>{const n=await au(Pe(be,"Users")),e=[];console.log(n);for(const t of n.docs){const r=t.data(),s=t.id;console.log(s);{const o=await Za(s,"/Orders"),a=await Za(s,"/Actions");e.push({id:s,...r,orders:o,actions:a})}}return e},Rp="Phase 1 Lab Configuration",wp=1200,Ap=10,Ip=3,bp=!1,Sp=!1,Cp=!1,Pp=!1,Dp=[{name:"Shorter cell distances",order_file:"order.json",store_file:"stores1.json"},{name:"Longer cell distances",order_file:"order.json",store_file:"stores2.json"}],kp=!0,ke={name:Rp,timeLimit:wp,thinkTime:Ap,gridSize:Ip,tips:bp,waiting:Sp,refresh:Cp,expire:Pp,conditions:Dp,auth:kp};let zi={},hu=[],el=0;function Vp(n,e){hu=n,zi=e}function Wp(n){console.log("queuing "+n+" orders");const e=[];for(let t=0;t<n;t++)e.push(hu[el]),el+=1;return e}function Qp(n){let e="";return zi.stores.forEach(t=>{t.store===n&&(e=t)}),e}function Yp(n){return zi.distances[n]}const Bp=JSON.parse('[{"round":1,"phase":"A","scenario_id":"A01","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R1_A","store":"Target","city":"Emeryville","earnings":18,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R1_B","store":"Target","city":"Emeryville","earnings":4,"aisles":[3,4,5],"travel_time_s":4,"recommended":false},{"id":"R1_C","store":"Target","city":"Emeryville","earnings":4,"aisles":[6,7,8],"travel_time_s":4,"recommended":false},{"id":"R1_D","store":"Target","city":"Emeryville","earnings":4,"aisles":[3,6,7],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R1_A"],"bundle_size":1,"efficiency_earnings_per_s":1.8,"total_time_s":10,"total_earnings":18,"num_aisles":2},"second_best":{"combo":["R1_A","R1_C","R1_D"],"bundle_size":3,"efficiency_earnings_per_s":1.444,"total_time_s":18,"total_earnings":26,"num_aisles":6}},{"round":2,"phase":"A","scenario_id":"A02","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R2_A","store":"Berkeley Bowl","city":"Berkeley","earnings":18,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R2_B","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[3,4,5],"travel_time_s":4,"recommended":false},{"id":"R2_C","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[6,7,8],"travel_time_s":4,"recommended":false},{"id":"R2_D","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[3,6,7],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R2_A"],"bundle_size":1,"efficiency_earnings_per_s":1.8,"total_time_s":10,"total_earnings":18,"num_aisles":2},"second_best":{"combo":["R2_A","R2_C","R2_D"],"bundle_size":3,"efficiency_earnings_per_s":1.444,"total_time_s":18,"total_earnings":26,"num_aisles":6}},{"round":3,"phase":"A","scenario_id":"A03","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R3_A","store":"Sprouts Farmers Market","city":"Oakland","earnings":18,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R3_B","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[3,4,5],"travel_time_s":4,"recommended":false},{"id":"R3_C","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[6,7,8],"travel_time_s":4,"recommended":false},{"id":"R3_D","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[3,6,7],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R3_A"],"bundle_size":1,"efficiency_earnings_per_s":1.8,"total_time_s":10,"total_earnings":18,"num_aisles":2},"second_best":{"combo":["R3_A","R3_C","R3_D"],"bundle_size":3,"efficiency_earnings_per_s":1.444,"total_time_s":18,"total_earnings":26,"num_aisles":6}},{"round":4,"phase":"A","scenario_id":"A04","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R4_A","store":"Safeway","city":"Piedmont","earnings":18,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R4_B","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[3,4,5],"travel_time_s":4,"recommended":false},{"id":"R4_C","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[6,7,8],"travel_time_s":4,"recommended":false},{"id":"R4_D","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[3,6,7],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R4_A"],"bundle_size":1,"efficiency_earnings_per_s":1.8,"total_time_s":10,"total_earnings":18,"num_aisles":2},"second_best":{"combo":["R4_A","R4_C","R4_D"],"bundle_size":3,"efficiency_earnings_per_s":1.444,"total_time_s":18,"total_earnings":26,"num_aisles":6}},{"round":5,"phase":"A","scenario_id":"A05","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R5_A","store":"Target","city":"Emeryville","earnings":18,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R5_B","store":"Target","city":"Emeryville","earnings":4,"aisles":[3,4,5],"travel_time_s":4,"recommended":false},{"id":"R5_C","store":"Target","city":"Emeryville","earnings":4,"aisles":[6,7,8],"travel_time_s":4,"recommended":false},{"id":"R5_D","store":"Target","city":"Emeryville","earnings":4,"aisles":[3,6,7],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R5_A"],"bundle_size":1,"efficiency_earnings_per_s":1.8,"total_time_s":10,"total_earnings":18,"num_aisles":2},"second_best":{"combo":["R5_A","R5_C","R5_D"],"bundle_size":3,"efficiency_earnings_per_s":1.444,"total_time_s":18,"total_earnings":26,"num_aisles":6}},{"round":6,"phase":"A","scenario_id":"A06","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R6_A","store":"Berkeley Bowl","city":"Berkeley","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R6_B","store":"Berkeley Bowl","city":"Berkeley","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":false},{"id":"R6_C","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R6_D","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R6_A","R6_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R6_A","R6_B","R6_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":7,"phase":"A","scenario_id":"A07","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R7_A","store":"Sprouts Farmers Market","city":"Oakland","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R7_B","store":"Sprouts Farmers Market","city":"Oakland","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":false},{"id":"R7_C","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R7_D","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R7_A","R7_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R7_A","R7_B","R7_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":8,"phase":"A","scenario_id":"A08","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R8_A","store":"Safeway","city":"Piedmont","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R8_B","store":"Safeway","city":"Piedmont","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":false},{"id":"R8_C","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R8_D","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R8_A","R8_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R8_A","R8_B","R8_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":9,"phase":"A","scenario_id":"A09","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R9_A","store":"Target","city":"Emeryville","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R9_B","store":"Target","city":"Emeryville","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":false},{"id":"R9_C","store":"Target","city":"Emeryville","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R9_D","store":"Target","city":"Emeryville","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R9_A","R9_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R9_A","R9_B","R9_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":10,"phase":"A","scenario_id":"A10","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R10_A","store":"Berkeley Bowl","city":"Berkeley","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R10_B","store":"Berkeley Bowl","city":"Berkeley","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":false},{"id":"R10_C","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R10_D","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R10_A","R10_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R10_A","R10_B","R10_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":11,"phase":"A","scenario_id":"A11","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R11_A","store":"Sprouts Farmers Market","city":"Oakland","earnings":15,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R11_B","store":"Sprouts Farmers Market","city":"Oakland","earnings":14,"aisles":[2,3],"travel_time_s":4,"recommended":false},{"id":"R11_C","store":"Sprouts Farmers Market","city":"Oakland","earnings":14,"aisles":[3,4],"travel_time_s":4,"recommended":false},{"id":"R11_D","store":"Sprouts Farmers Market","city":"Oakland","earnings":11,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R11_A","R11_B","R11_C"],"bundle_size":3,"efficiency_earnings_per_s":3.071,"total_time_s":14,"total_earnings":43,"num_aisles":4},"second_best":{"combo":["R11_A","R11_B","R11_D"],"bundle_size":3,"efficiency_earnings_per_s":2.5,"total_time_s":16,"total_earnings":40,"num_aisles":5}},{"round":12,"phase":"A","scenario_id":"A12","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R12_A","store":"Safeway","city":"Piedmont","earnings":15,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R12_B","store":"Safeway","city":"Piedmont","earnings":14,"aisles":[2,3],"travel_time_s":4,"recommended":false},{"id":"R12_C","store":"Safeway","city":"Piedmont","earnings":14,"aisles":[3,4],"travel_time_s":4,"recommended":false},{"id":"R12_D","store":"Safeway","city":"Piedmont","earnings":11,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R12_A","R12_B","R12_C"],"bundle_size":3,"efficiency_earnings_per_s":3.071,"total_time_s":14,"total_earnings":43,"num_aisles":4},"second_best":{"combo":["R12_A","R12_B","R12_D"],"bundle_size":3,"efficiency_earnings_per_s":2.5,"total_time_s":16,"total_earnings":40,"num_aisles":5}},{"round":13,"phase":"A","scenario_id":"A13","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R13_A","store":"Target","city":"Emeryville","earnings":15,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R13_B","store":"Target","city":"Emeryville","earnings":14,"aisles":[2,3],"travel_time_s":4,"recommended":false},{"id":"R13_C","store":"Target","city":"Emeryville","earnings":14,"aisles":[3,4],"travel_time_s":4,"recommended":false},{"id":"R13_D","store":"Target","city":"Emeryville","earnings":11,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R13_A","R13_B","R13_C"],"bundle_size":3,"efficiency_earnings_per_s":3.071,"total_time_s":14,"total_earnings":43,"num_aisles":4},"second_best":{"combo":["R13_A","R13_B","R13_D"],"bundle_size":3,"efficiency_earnings_per_s":2.5,"total_time_s":16,"total_earnings":40,"num_aisles":5}},{"round":14,"phase":"A","scenario_id":"A14","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R14_A","store":"Berkeley Bowl","city":"Berkeley","earnings":15,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R14_B","store":"Berkeley Bowl","city":"Berkeley","earnings":14,"aisles":[2,3],"travel_time_s":4,"recommended":false},{"id":"R14_C","store":"Berkeley Bowl","city":"Berkeley","earnings":14,"aisles":[3,4],"travel_time_s":4,"recommended":false},{"id":"R14_D","store":"Berkeley Bowl","city":"Berkeley","earnings":11,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R14_A","R14_B","R14_C"],"bundle_size":3,"efficiency_earnings_per_s":3.071,"total_time_s":14,"total_earnings":43,"num_aisles":4},"second_best":{"combo":["R14_A","R14_B","R14_D"],"bundle_size":3,"efficiency_earnings_per_s":2.5,"total_time_s":16,"total_earnings":40,"num_aisles":5}},{"round":15,"phase":"A","scenario_id":"A15","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R15_A","store":"Sprouts Farmers Market","city":"Oakland","earnings":15,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R15_B","store":"Sprouts Farmers Market","city":"Oakland","earnings":14,"aisles":[2,3],"travel_time_s":4,"recommended":false},{"id":"R15_C","store":"Sprouts Farmers Market","city":"Oakland","earnings":14,"aisles":[3,4],"travel_time_s":4,"recommended":false},{"id":"R15_D","store":"Sprouts Farmers Market","city":"Oakland","earnings":11,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R15_A","R15_B","R15_C"],"bundle_size":3,"efficiency_earnings_per_s":3.071,"total_time_s":14,"total_earnings":43,"num_aisles":4},"second_best":{"combo":["R15_A","R15_B","R15_D"],"bundle_size":3,"efficiency_earnings_per_s":2.5,"total_time_s":16,"total_earnings":40,"num_aisles":5}},{"round":16,"phase":"B","scenario_id":"B16","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R16_A","store":"Safeway","city":"Piedmont","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R16_B","store":"Safeway","city":"Piedmont","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":true},{"id":"R16_C","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R16_D","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R16_A","R16_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R16_A","R16_B","R16_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":17,"phase":"B","scenario_id":"B17","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R17_A","store":"Target","city":"Emeryville","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R17_B","store":"Target","city":"Emeryville","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":true},{"id":"R17_C","store":"Target","city":"Emeryville","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R17_D","store":"Target","city":"Emeryville","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R17_A","R17_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R17_A","R17_B","R17_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":18,"phase":"B","scenario_id":"B18","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R18_A","store":"Berkeley Bowl","city":"Berkeley","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R18_B","store":"Berkeley Bowl","city":"Berkeley","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":true},{"id":"R18_C","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R18_D","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R18_A","R18_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R18_A","R18_B","R18_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":19,"phase":"B","scenario_id":"B19","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R19_A","store":"Sprouts Farmers Market","city":"Oakland","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R19_B","store":"Sprouts Farmers Market","city":"Oakland","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":true},{"id":"R19_C","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R19_D","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R19_A","R19_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R19_A","R19_B","R19_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":20,"phase":"B","scenario_id":"B20","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R20_A","store":"Safeway","city":"Piedmont","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R20_B","store":"Safeway","city":"Piedmont","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":true},{"id":"R20_C","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R20_D","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R20_A","R20_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R20_A","R20_B","R20_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":21,"phase":"B","scenario_id":"B21","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R21_A","store":"Target","city":"Emeryville","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R21_B","store":"Target","city":"Emeryville","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":true},{"id":"R21_C","store":"Target","city":"Emeryville","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R21_D","store":"Target","city":"Emeryville","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R21_A","R21_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R21_A","R21_B","R21_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":22,"phase":"B","scenario_id":"B22","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R22_A","store":"Berkeley Bowl","city":"Berkeley","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R22_B","store":"Berkeley Bowl","city":"Berkeley","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":true},{"id":"R22_C","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R22_D","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R22_A","R22_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R22_A","R22_B","R22_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":23,"phase":"B","scenario_id":"B23","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R23_A","store":"Sprouts Farmers Market","city":"Oakland","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R23_B","store":"Sprouts Farmers Market","city":"Oakland","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":true},{"id":"R23_C","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R23_D","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R23_A","R23_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R23_A","R23_B","R23_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":24,"phase":"B","scenario_id":"B24","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R24_A","store":"Safeway","city":"Piedmont","earnings":18,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R24_B","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[3,4,5],"travel_time_s":4,"recommended":true},{"id":"R24_C","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[6,7,8],"travel_time_s":4,"recommended":false},{"id":"R24_D","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[3,6,7],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R24_A"],"bundle_size":1,"efficiency_earnings_per_s":1.8,"total_time_s":10,"total_earnings":18,"num_aisles":2},"second_best":{"combo":["R24_A","R24_C","R24_D"],"bundle_size":3,"efficiency_earnings_per_s":1.444,"total_time_s":18,"total_earnings":26,"num_aisles":6}},{"round":25,"phase":"B","scenario_id":"B25","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R25_A","store":"Target","city":"Emeryville","earnings":18,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R25_B","store":"Target","city":"Emeryville","earnings":4,"aisles":[3,4,5],"travel_time_s":4,"recommended":true},{"id":"R25_C","store":"Target","city":"Emeryville","earnings":4,"aisles":[6,7,8],"travel_time_s":4,"recommended":false},{"id":"R25_D","store":"Target","city":"Emeryville","earnings":4,"aisles":[3,6,7],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R25_A"],"bundle_size":1,"efficiency_earnings_per_s":1.8,"total_time_s":10,"total_earnings":18,"num_aisles":2},"second_best":{"combo":["R25_A","R25_C","R25_D"],"bundle_size":3,"efficiency_earnings_per_s":1.444,"total_time_s":18,"total_earnings":26,"num_aisles":6}},{"round":26,"phase":"B","scenario_id":"B26","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R26_A","store":"Berkeley Bowl","city":"Berkeley","earnings":18,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R26_B","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[3,4,5],"travel_time_s":4,"recommended":true},{"id":"R26_C","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[6,7,8],"travel_time_s":4,"recommended":false},{"id":"R26_D","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[3,6,7],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R26_A"],"bundle_size":1,"efficiency_earnings_per_s":1.8,"total_time_s":10,"total_earnings":18,"num_aisles":2},"second_best":{"combo":["R26_A","R26_C","R26_D"],"bundle_size":3,"efficiency_earnings_per_s":1.444,"total_time_s":18,"total_earnings":26,"num_aisles":6}},{"round":27,"phase":"B","scenario_id":"B27","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R27_A","store":"Sprouts Farmers Market","city":"Oakland","earnings":18,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R27_B","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[3,4,5],"travel_time_s":4,"recommended":true},{"id":"R27_C","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[6,7,8],"travel_time_s":4,"recommended":false},{"id":"R27_D","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[3,6,7],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R27_A"],"bundle_size":1,"efficiency_earnings_per_s":1.8,"total_time_s":10,"total_earnings":18,"num_aisles":2},"second_best":{"combo":["R27_A","R27_C","R27_D"],"bundle_size":3,"efficiency_earnings_per_s":1.444,"total_time_s":18,"total_earnings":26,"num_aisles":6}},{"round":28,"phase":"B","scenario_id":"B28","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R28_A","store":"Safeway","city":"Piedmont","earnings":18,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R28_B","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[3,4,5],"travel_time_s":4,"recommended":true},{"id":"R28_C","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[6,7,8],"travel_time_s":4,"recommended":false},{"id":"R28_D","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[3,6,7],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R28_A"],"bundle_size":1,"efficiency_earnings_per_s":1.8,"total_time_s":10,"total_earnings":18,"num_aisles":2},"second_best":{"combo":["R28_A","R28_C","R28_D"],"bundle_size":3,"efficiency_earnings_per_s":1.444,"total_time_s":18,"total_earnings":26,"num_aisles":6}},{"round":29,"phase":"B","scenario_id":"B29","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R29_A","store":"Target","city":"Emeryville","earnings":18,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R29_B","store":"Target","city":"Emeryville","earnings":4,"aisles":[3,4,5],"travel_time_s":4,"recommended":true},{"id":"R29_C","store":"Target","city":"Emeryville","earnings":4,"aisles":[6,7,8],"travel_time_s":4,"recommended":false},{"id":"R29_D","store":"Target","city":"Emeryville","earnings":4,"aisles":[3,6,7],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R29_A"],"bundle_size":1,"efficiency_earnings_per_s":1.8,"total_time_s":10,"total_earnings":18,"num_aisles":2},"second_best":{"combo":["R29_A","R29_C","R29_D"],"bundle_size":3,"efficiency_earnings_per_s":1.444,"total_time_s":18,"total_earnings":26,"num_aisles":6}},{"round":30,"phase":"B","scenario_id":"B30","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R30_A","store":"Berkeley Bowl","city":"Berkeley","earnings":15,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R30_B","store":"Berkeley Bowl","city":"Berkeley","earnings":14,"aisles":[2,3],"travel_time_s":4,"recommended":true},{"id":"R30_C","store":"Berkeley Bowl","city":"Berkeley","earnings":14,"aisles":[3,4],"travel_time_s":4,"recommended":false},{"id":"R30_D","store":"Berkeley Bowl","city":"Berkeley","earnings":11,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R30_A","R30_B","R30_C"],"bundle_size":3,"efficiency_earnings_per_s":3.071,"total_time_s":14,"total_earnings":43,"num_aisles":4},"second_best":{"combo":["R30_A","R30_B","R30_D"],"bundle_size":3,"efficiency_earnings_per_s":2.5,"total_time_s":16,"total_earnings":40,"num_aisles":5}},{"round":31,"phase":"B","scenario_id":"B31","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R31_A","store":"Sprouts Farmers Market","city":"Oakland","earnings":15,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R31_B","store":"Sprouts Farmers Market","city":"Oakland","earnings":14,"aisles":[2,3],"travel_time_s":4,"recommended":true},{"id":"R31_C","store":"Sprouts Farmers Market","city":"Oakland","earnings":14,"aisles":[3,4],"travel_time_s":4,"recommended":false},{"id":"R31_D","store":"Sprouts Farmers Market","city":"Oakland","earnings":11,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R31_A","R31_B","R31_C"],"bundle_size":3,"efficiency_earnings_per_s":3.071,"total_time_s":14,"total_earnings":43,"num_aisles":4},"second_best":{"combo":["R31_A","R31_B","R31_D"],"bundle_size":3,"efficiency_earnings_per_s":2.5,"total_time_s":16,"total_earnings":40,"num_aisles":5}},{"round":32,"phase":"B","scenario_id":"B32","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R32_A","store":"Safeway","city":"Piedmont","earnings":15,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R32_B","store":"Safeway","city":"Piedmont","earnings":14,"aisles":[2,3],"travel_time_s":4,"recommended":true},{"id":"R32_C","store":"Safeway","city":"Piedmont","earnings":14,"aisles":[3,4],"travel_time_s":4,"recommended":false},{"id":"R32_D","store":"Safeway","city":"Piedmont","earnings":11,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R32_A","R32_B","R32_C"],"bundle_size":3,"efficiency_earnings_per_s":3.071,"total_time_s":14,"total_earnings":43,"num_aisles":4},"second_best":{"combo":["R32_A","R32_B","R32_D"],"bundle_size":3,"efficiency_earnings_per_s":2.5,"total_time_s":16,"total_earnings":40,"num_aisles":5}},{"round":33,"phase":"B","scenario_id":"B33","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R33_A","store":"Target","city":"Emeryville","earnings":15,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R33_B","store":"Target","city":"Emeryville","earnings":14,"aisles":[2,3],"travel_time_s":4,"recommended":true},{"id":"R33_C","store":"Target","city":"Emeryville","earnings":14,"aisles":[3,4],"travel_time_s":4,"recommended":false},{"id":"R33_D","store":"Target","city":"Emeryville","earnings":11,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R33_A","R33_B","R33_C"],"bundle_size":3,"efficiency_earnings_per_s":3.071,"total_time_s":14,"total_earnings":43,"num_aisles":4},"second_best":{"combo":["R33_A","R33_B","R33_D"],"bundle_size":3,"efficiency_earnings_per_s":2.5,"total_time_s":16,"total_earnings":40,"num_aisles":5}},{"round":34,"phase":"B","scenario_id":"B34","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R34_A","store":"Berkeley Bowl","city":"Berkeley","earnings":15,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R34_B","store":"Berkeley Bowl","city":"Berkeley","earnings":14,"aisles":[2,3],"travel_time_s":4,"recommended":true},{"id":"R34_C","store":"Berkeley Bowl","city":"Berkeley","earnings":14,"aisles":[3,4],"travel_time_s":4,"recommended":false},{"id":"R34_D","store":"Berkeley Bowl","city":"Berkeley","earnings":11,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R34_A","R34_B","R34_C"],"bundle_size":3,"efficiency_earnings_per_s":3.071,"total_time_s":14,"total_earnings":43,"num_aisles":4},"second_best":{"combo":["R34_A","R34_B","R34_D"],"bundle_size":3,"efficiency_earnings_per_s":2.5,"total_time_s":16,"total_earnings":40,"num_aisles":5}},{"round":35,"phase":"B","scenario_id":"B35","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R35_A","store":"Sprouts Farmers Market","city":"Oakland","earnings":15,"aisles":[1,2],"travel_time_s":4,"recommended":true},{"id":"R35_B","store":"Sprouts Farmers Market","city":"Oakland","earnings":14,"aisles":[2,3],"travel_time_s":4,"recommended":true},{"id":"R35_C","store":"Sprouts Farmers Market","city":"Oakland","earnings":14,"aisles":[3,4],"travel_time_s":4,"recommended":false},{"id":"R35_D","store":"Sprouts Farmers Market","city":"Oakland","earnings":11,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R35_A","R35_B","R35_C"],"bundle_size":3,"efficiency_earnings_per_s":3.071,"total_time_s":14,"total_earnings":43,"num_aisles":4},"second_best":{"combo":["R35_A","R35_B","R35_D"],"bundle_size":3,"efficiency_earnings_per_s":2.5,"total_time_s":16,"total_earnings":40,"num_aisles":5}},{"round":36,"phase":"C","scenario_id":"C36","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R36_A","store":"Safeway","city":"Piedmont","earnings":18,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R36_B","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[3,4,5],"travel_time_s":4,"recommended":false},{"id":"R36_C","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[6,7,8],"travel_time_s":4,"recommended":false},{"id":"R36_D","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[3,6,7],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R36_A"],"bundle_size":1,"efficiency_earnings_per_s":1.8,"total_time_s":10,"total_earnings":18,"num_aisles":2},"second_best":{"combo":["R36_A","R36_C","R36_D"],"bundle_size":3,"efficiency_earnings_per_s":1.444,"total_time_s":18,"total_earnings":26,"num_aisles":6}},{"round":37,"phase":"C","scenario_id":"C37","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R37_A","store":"Target","city":"Emeryville","earnings":18,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R37_B","store":"Target","city":"Emeryville","earnings":4,"aisles":[3,4,5],"travel_time_s":4,"recommended":false},{"id":"R37_C","store":"Target","city":"Emeryville","earnings":4,"aisles":[6,7,8],"travel_time_s":4,"recommended":false},{"id":"R37_D","store":"Target","city":"Emeryville","earnings":4,"aisles":[3,6,7],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R37_A"],"bundle_size":1,"efficiency_earnings_per_s":1.8,"total_time_s":10,"total_earnings":18,"num_aisles":2},"second_best":{"combo":["R37_A","R37_C","R37_D"],"bundle_size":3,"efficiency_earnings_per_s":1.444,"total_time_s":18,"total_earnings":26,"num_aisles":6}},{"round":38,"phase":"C","scenario_id":"C38","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R38_A","store":"Berkeley Bowl","city":"Berkeley","earnings":18,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R38_B","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[3,4,5],"travel_time_s":4,"recommended":false},{"id":"R38_C","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[6,7,8],"travel_time_s":4,"recommended":false},{"id":"R38_D","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[3,6,7],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R38_A"],"bundle_size":1,"efficiency_earnings_per_s":1.8,"total_time_s":10,"total_earnings":18,"num_aisles":2},"second_best":{"combo":["R38_A","R38_C","R38_D"],"bundle_size":3,"efficiency_earnings_per_s":1.444,"total_time_s":18,"total_earnings":26,"num_aisles":6}},{"round":39,"phase":"C","scenario_id":"C39","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R39_A","store":"Sprouts Farmers Market","city":"Oakland","earnings":18,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R39_B","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[3,4,5],"travel_time_s":4,"recommended":false},{"id":"R39_C","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[6,7,8],"travel_time_s":4,"recommended":false},{"id":"R39_D","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[3,6,7],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R39_A"],"bundle_size":1,"efficiency_earnings_per_s":1.8,"total_time_s":10,"total_earnings":18,"num_aisles":2},"second_best":{"combo":["R39_A","R39_C","R39_D"],"bundle_size":3,"efficiency_earnings_per_s":1.444,"total_time_s":18,"total_earnings":26,"num_aisles":6}},{"round":40,"phase":"C","scenario_id":"C40","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R40_A","store":"Safeway","city":"Piedmont","earnings":18,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R40_B","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[3,4,5],"travel_time_s":4,"recommended":false},{"id":"R40_C","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[6,7,8],"travel_time_s":4,"recommended":false},{"id":"R40_D","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[3,6,7],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R40_A"],"bundle_size":1,"efficiency_earnings_per_s":1.8,"total_time_s":10,"total_earnings":18,"num_aisles":2},"second_best":{"combo":["R40_A","R40_C","R40_D"],"bundle_size":3,"efficiency_earnings_per_s":1.444,"total_time_s":18,"total_earnings":26,"num_aisles":6}},{"round":41,"phase":"C","scenario_id":"C41","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R41_A","store":"Target","city":"Emeryville","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R41_B","store":"Target","city":"Emeryville","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":false},{"id":"R41_C","store":"Target","city":"Emeryville","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R41_D","store":"Target","city":"Emeryville","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R41_A","R41_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R41_A","R41_B","R41_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":42,"phase":"C","scenario_id":"C42","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R42_A","store":"Berkeley Bowl","city":"Berkeley","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R42_B","store":"Berkeley Bowl","city":"Berkeley","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":false},{"id":"R42_C","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R42_D","store":"Berkeley Bowl","city":"Berkeley","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R42_A","R42_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R42_A","R42_B","R42_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":43,"phase":"C","scenario_id":"C43","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R43_A","store":"Sprouts Farmers Market","city":"Oakland","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R43_B","store":"Sprouts Farmers Market","city":"Oakland","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":false},{"id":"R43_C","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R43_D","store":"Sprouts Farmers Market","city":"Oakland","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R43_A","R43_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R43_A","R43_B","R43_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":44,"phase":"C","scenario_id":"C44","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R44_A","store":"Safeway","city":"Piedmont","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R44_B","store":"Safeway","city":"Piedmont","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":false},{"id":"R44_C","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R44_D","store":"Safeway","city":"Piedmont","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R44_A","R44_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R44_A","R44_B","R44_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":45,"phase":"C","scenario_id":"C45","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R45_A","store":"Target","city":"Emeryville","earnings":10,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R45_B","store":"Target","city":"Emeryville","earnings":10,"aisles":[1,2,3],"travel_time_s":4,"recommended":false},{"id":"R45_C","store":"Target","city":"Emeryville","earnings":4,"aisles":[4,5,6],"travel_time_s":4,"recommended":false},{"id":"R45_D","store":"Target","city":"Emeryville","earnings":4,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R45_A","R45_B"],"bundle_size":2,"efficiency_earnings_per_s":1.667,"total_time_s":12,"total_earnings":20,"num_aisles":3},"second_best":{"combo":["R45_A","R45_B","R45_D"],"bundle_size":3,"efficiency_earnings_per_s":1.5,"total_time_s":16,"total_earnings":24,"num_aisles":5}},{"round":46,"phase":"C","scenario_id":"C46","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R46_A","store":"Berkeley Bowl","city":"Berkeley","earnings":15,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R46_B","store":"Berkeley Bowl","city":"Berkeley","earnings":14,"aisles":[2,3],"travel_time_s":4,"recommended":false},{"id":"R46_C","store":"Berkeley Bowl","city":"Berkeley","earnings":14,"aisles":[3,4],"travel_time_s":4,"recommended":false},{"id":"R46_D","store":"Berkeley Bowl","city":"Berkeley","earnings":11,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R46_A","R46_B","R46_C"],"bundle_size":3,"efficiency_earnings_per_s":3.071,"total_time_s":14,"total_earnings":43,"num_aisles":4},"second_best":{"combo":["R46_A","R46_B","R46_D"],"bundle_size":3,"efficiency_earnings_per_s":2.5,"total_time_s":16,"total_earnings":40,"num_aisles":5}},{"round":47,"phase":"C","scenario_id":"C47","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R47_A","store":"Sprouts Farmers Market","city":"Oakland","earnings":15,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R47_B","store":"Sprouts Farmers Market","city":"Oakland","earnings":14,"aisles":[2,3],"travel_time_s":4,"recommended":false},{"id":"R47_C","store":"Sprouts Farmers Market","city":"Oakland","earnings":14,"aisles":[3,4],"travel_time_s":4,"recommended":false},{"id":"R47_D","store":"Sprouts Farmers Market","city":"Oakland","earnings":11,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R47_A","R47_B","R47_C"],"bundle_size":3,"efficiency_earnings_per_s":3.071,"total_time_s":14,"total_earnings":43,"num_aisles":4},"second_best":{"combo":["R47_A","R47_B","R47_D"],"bundle_size":3,"efficiency_earnings_per_s":2.5,"total_time_s":16,"total_earnings":40,"num_aisles":5}},{"round":48,"phase":"C","scenario_id":"C48","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R48_A","store":"Safeway","city":"Piedmont","earnings":15,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R48_B","store":"Safeway","city":"Piedmont","earnings":14,"aisles":[2,3],"travel_time_s":4,"recommended":false},{"id":"R48_C","store":"Safeway","city":"Piedmont","earnings":14,"aisles":[3,4],"travel_time_s":4,"recommended":false},{"id":"R48_D","store":"Safeway","city":"Piedmont","earnings":11,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R48_A","R48_B","R48_C"],"bundle_size":3,"efficiency_earnings_per_s":3.071,"total_time_s":14,"total_earnings":43,"num_aisles":4},"second_best":{"combo":["R48_A","R48_B","R48_D"],"bundle_size":3,"efficiency_earnings_per_s":2.5,"total_time_s":16,"total_earnings":40,"num_aisles":5}},{"round":49,"phase":"C","scenario_id":"C49","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R49_A","store":"Target","city":"Emeryville","earnings":15,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R49_B","store":"Target","city":"Emeryville","earnings":14,"aisles":[2,3],"travel_time_s":4,"recommended":false},{"id":"R49_C","store":"Target","city":"Emeryville","earnings":14,"aisles":[3,4],"travel_time_s":4,"recommended":false},{"id":"R49_D","store":"Target","city":"Emeryville","earnings":11,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R49_A","R49_B","R49_C"],"bundle_size":3,"efficiency_earnings_per_s":3.071,"total_time_s":14,"total_earnings":43,"num_aisles":4},"second_best":{"combo":["R49_A","R49_B","R49_D"],"bundle_size":3,"efficiency_earnings_per_s":2.5,"total_time_s":16,"total_earnings":40,"num_aisles":5}},{"round":50,"phase":"C","scenario_id":"C50","max_bundle":3,"store_travel_time_s":4,"base_store_time_s":2,"per_aisle_time_s":2,"orders":[{"id":"R50_A","store":"Berkeley Bowl","city":"Berkeley","earnings":15,"aisles":[1,2],"travel_time_s":4,"recommended":false},{"id":"R50_B","store":"Berkeley Bowl","city":"Berkeley","earnings":14,"aisles":[2,3],"travel_time_s":4,"recommended":false},{"id":"R50_C","store":"Berkeley Bowl","city":"Berkeley","earnings":14,"aisles":[3,4],"travel_time_s":4,"recommended":false},{"id":"R50_D","store":"Berkeley Bowl","city":"Berkeley","earnings":11,"aisles":[7,8],"travel_time_s":4,"recommended":false}],"optimal":{"combo":["R50_A","R50_B","R50_C"],"bundle_size":3,"efficiency_earnings_per_s":3.071,"total_time_s":14,"total_earnings":43,"num_aisles":4},"second_best":{"combo":["R50_A","R50_B","R50_D"],"bundle_size":3,"efficiency_earnings_per_s":2.5,"total_time_s":16,"total_earnings":40,"num_aisles":5}}]'),wr=Object.assign({"./configs/optimal.json":()=>ln(()=>import("./DkUJrxWL.js"),[],import.meta.url),"./configs/order.json":()=>ln(()=>import("./BduYV3TO.js"),[],import.meta.url),"./configs/possibilities.json":()=>ln(()=>import("./D495dsFJ.js"),[],import.meta.url),"./configs/stores1.json":()=>ln(()=>import("./w1r_aM8a.js"),[],import.meta.url),"./configs/stores2.json":()=>ln(()=>import("./DNTWVHAx.js"),[],import.meta.url)});Object.keys(wr).map(n=>({name:n.split("/").pop(),importFn:wr[n]}));let Ss={},tl=[],du,dr,nl=0;const ji=Se(0),Xp=Se([]),Vt=ke.timeLimit,Jp=ke.gridSize,Zp=Se(1),Cs=Bp,ey=Se(0);function ty(n){return Cs.find(e=>e.round===n)??Cs[Cs.length-1]}const _u=Se(!1),ny=Se({selector:"None selected"}),ry=ke.thinkTime,sy=4,iy=Se({inSelect:!1,inStore:!1,bundled:!1,tip:ke.tips,waiting:ke.waiting,refresh:ke.refresh});function oy(){du=new Date}let Ps;const fu=Se(new Date),ay=()=>(Ps=setInterval(()=>{fu.set(new Date)},10),dr=()=>clearInterval(Ps),function(){clearInterval(Ps)});let Np=0;const mu=Zs(fu,n=>n.getTime()-du-Np);mu.subscribe(n=>{ie(_u)});const ly=Se([]),qi=Se([]),Pn=Se(""),$i=Se(0),Op=Se(""),qr=Zs(mu,(n,e)=>{const t=Math.round(n/1e3);if(t>=Vt&&t<=Vt+2){uu(ie(Pn),{earnings:ie($i),ordersComplete:ie(qi).length,uniqueSetsComplete:ie(ji),gametime:Vt}),_u.set(!0),dr==null||dr(),e(Vt),console.log("game over");return}e(t)}),cy=Zs(qr,n=>Math.max(Vt-n,0)),uy=n=>{n.earnings=ie($i),n.ordersComplete=ie(qi).length,n.gametime=ie(qr),n.uniqueSetsComplete=ie(ji),console.log(n),vp(ie(Pn),n,nl+"_"+n.buttonID),nl+=1},hy=(n,e)=>{const t=ie(qr),r=e.map(s=>s.id);n.forEach((s,o)=>{s.startgametime=t,s.status=0,s.bundled=n.length>1,s.bundleSize=n.length,s.bundled&&(s.bundledWith=n.filter((a,c)=>c!==o).map(a=>a.id)),s.options=r,Ep(ie(Pn),s,s.id)})},dy=n=>{let e={status:1,endgametime:ie(qr)};Tp(ie(Pn),e,n),uu(ie(Pn),{earnings:ie($i),ordersComplete:ie(qi).length,uniqueSetsComplete:ie(ji),gametime:Vt})},_y=(n,e)=>yp(n,e);async function rl(n){const e=Object.keys(wr).find(r=>r.endsWith(n));return e?(await wr[e]()).default:(console.error(`Config file "${n}" not found in ../configs/`),null)}async function Mp(){let n=0;if(ke.conditions.length>1){let e=await fp();await _p(),n=e%ke.conditions.length}try{let e=await rl(ke.conditions[n].order_file),t=await rl(ke.conditions[n].store_file);!e||!t?console.error("Could not find files specified in configuration"):(Ss=t,tl=e)}catch(e){return console.error("Error creating conditions",e),-1}return Op.set(Ss.startinglocation),Vp(tl,Ss),n}async function fy(n){let e=await Mp();return await mp(n,e),e}export{fy as A,ay as B,oy as C,Pn as D,Kp as E,Vt as F,_u as G,sy as H,uu as I,fp as J,_p as K,Vp as L,Bp as M,Hp as a,jp as b,Ko as c,$i as d,qr as e,dy as f,iy as g,ty as h,Zp as i,qi as j,ey as k,uy as l,Xp as m,Jp as n,ly as o,Op as p,Wp as q,zp as r,Qp as s,ny as t,ji as u,ry as v,Yp as w,hy as x,cy as y,_y as z};
