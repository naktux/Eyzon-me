import { EMPTY, STALE_MS, isMood, validTarget, validSpace, type Snapshot } from "./protocol";
let snapshot: Snapshot = { ...EMPTY };
let owner: number | undefined;
let controller: chrome.runtime.Port | undefined;
const viewers = new Map<chrome.runtime.Port, boolean>();
const ready = chrome.storage.session.get(["snapshot", "owner"]).then(saved => {
  if (saved.snapshot) snapshot = { ...EMPTY, ...saved.snapshot };
  if (typeof saved.owner === "number" && Number.isInteger(saved.owner)) owner = saved.owner;
});
function send(port: chrome.runtime.Port, message: unknown) { try { port.postMessage(message); } catch { viewers.delete(port); } }
function fresh() { return { ...snapshot, running: snapshot.running && Date.now() - snapshot.updatedAt < STALE_MS }; }
function broadcast() { for (const [port, visible] of viewers) if (visible) send(port, { type: "snapshot", snapshot: fresh() }); }
let lastSave=0;
function save() { lastSave=Date.now(); void chrome.storage.session.set({ snapshot, owner: owner ?? null }); }
function stop() { snapshot = { ...snapshot, running: false, updatedAt: Date.now() }; save(); broadcast(); }
chrome.runtime.onConnect.addListener(port => {
  void (async () => {
    await ready;
    const tabId = port.sender?.tab?.id;
    if (tabId === undefined || port.sender?.frameId !== 0) return port.disconnect();
    if (port.name === "controller" && port.sender?.url?.split(/[?#]/)[0] === chrome.runtime.getURL("dashboard.html")) {
      if (owner !== undefined && owner !== tabId) {
        const existing = await chrome.tabs.get(owner).catch(() => null);
        if (existing) return send(port, { type: "owner", accepted: false });
      }
      owner = tabId; controller = port; stop(); save();
      send(port, { type: "owner", accepted: true });
      port.onMessage.addListener(message => {
        if (controller !== port || message?.type !== "publish" || typeof message.running !== "boolean" || !Number.isFinite(message.score) || message.score < 0 || message.score > 100 || !isMood(message.mood)||typeof message.distracted!=="boolean"||!validTarget(message.target)||!validSpace(message.space)) return;
        const changed = snapshot.running !== message.running || snapshot.mood !== message.mood;
        const reaction=message.reaction&&typeof message.reaction.text==="string"&&message.reaction.text.length<=180&&Number.isFinite(message.reaction.id)&&Number.isFinite(message.reaction.expiresAt)?message.reaction:null;
        snapshot = { ...snapshot, running: message.running, score: message.score, mood: message.mood, distracted:message.distracted,target:message.target,space:message.space,reaction, updatedAt: Date.now() };
        if(changed||Date.now()-lastSave>=1000)save(); broadcast();
      });
      port.onDisconnect.addListener(() => { if (controller === port) { controller = undefined; stop(); } });
    } else if (port.name === "pet" && /^https?:\/\//.test(port.sender?.url || "")) {
      viewers.set(port, true); send(port, { type: "snapshot", snapshot: fresh() });
      port.onMessage.addListener(message => {
        if (message?.type === "visible" && typeof message.visible === "boolean") {
          viewers.set(port, message.visible); if (message.visible) send(port, { type: "snapshot", snapshot: fresh() });
        } else if (message?.type === "position" && Number.isFinite(message.position)) {
          snapshot.position = Math.max(0, Math.min(1, message.position));
          if(Number.isFinite(message.positionY))snapshot.positionY=Math.max(0,Math.min(1,message.positionY)); save(); broadcast();
        }
      });
      port.onDisconnect.addListener(() => viewers.delete(port));
    } else port.disconnect();
  })();
});
// Heartbeats refresh the pet watchdog without broadcasting high-frequency camera data.
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if(message?.type==='getViewportZoom'&&sender.tab?.id!==undefined&&sender.frameId===0){void chrome.tabs.getZoom(sender.tab.id).then(respond).catch(()=>respond(1));return true;}
  if (message?.type === "getSnapshot" && sender.tab && sender.frameId === 0) {
    void ready.then(() => respond(fresh())); return true;
  }
});
chrome.tabs.onRemoved.addListener(tabId => { void ready.then(() => { if (owner === tabId) { owner = undefined; controller = undefined; stop(); } }); });
let opening = false;
chrome.action.onClicked.addListener(() => {
  if (opening) return; opening = true;
  void (async () => {
    await ready;
    const url = chrome.runtime.getURL("dashboard.html");
    const contexts = await chrome.runtime.getContexts({ contextTypes: [chrome.runtime.ContextType.TAB] });
    const tab = contexts.find(c => c.tabId >= 0 && c.documentUrl?.split(/[?#]/)[0] === url);
    if (tab) { await chrome.tabs.update(tab.tabId, { active: true }); await chrome.windows.update(tab.windowId, { focused: true }); }
    else await chrome.tabs.create({ url });
  })().finally(() => { opening = false; });
});
