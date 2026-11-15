import type {CSSProperties} from "react";
import {urgency} from "../lib/motion.mjs";
import type { Mood,Reaction } from "../extension/protocol";
import "./pet.css";
const labels: Record<Mood, string> = { studying: "Studying", suspicious: "Suspicious", panicking: "Panicking", fainted: "Fainted" };
/** Temporary pixel geometry. Replace this rendering layer when the sprite folder arrives. */
export default function PetCompanion({mood,overlay=false,distracted=false,score=100,reaction=null}: {mood:Mood;overlay?:boolean;distracted?:boolean;score?:number;reaction?:Reaction}) {
 const intensity=urgency(score),agitated=distracted&&mood!=="fainted",nearFaint=agitated&&score<30;
 const style={"--jump-duration":`${1.15-intensity*.6}s`,"--jump-height":`${18+intensity*36}px`,"--shake-duration":`${.2-intensity*.09}s`,"--run-duration":`${.4-intensity*.18}s`,"--flash-duration":`${1.8-intensity*.6}s`} as CSSProperties;
 return <div style={style} data-distracted={agitated} data-near-faint={nearFaint} className={"focus-pet mood-" + mood + (overlay ? " pet-overlay" : "")} role="img" aria-label={labels[mood] + " Eyzon"}>
  {reaction&&reaction.expiresAt>Date.now()&&<span className="pet-speech" role="status">{reaction.text}</span>}
  <div className="pet-hop"><div className="pet-jitter"><div className="pet-facing"><svg viewBox="0 0 48 48" shapeRendering="crispEdges" aria-hidden="true">
   <ellipse className="pet-shadow" cx="24" cy="44" rx="18" ry="2" fill="#263c3322"/>
   <g className="pet-body">
    <path className="pet-tail" d="M37 34h7v-7h3v10H37Z" fill="#9fb78e" stroke="#5d7664"/>
    <path className="pet-leg left-leg" d="M12 37h8v8h-9v-3h1Z" fill="#9fb78e" stroke="#5d7664"/>
    <path className="pet-leg right-leg" d="M28 37h8v5h1v3h-9Z" fill="#9fb78e" stroke="#5d7664"/>

    <path d="M10 17V9h8v4h12V9h8v8h3v21h-4v4H11v-4H7V17Z" fill="#5d7664"/>
    <path d="M12 18v-7h4v6h16v-6h4v7h3v18h-4v4H13v-4H9V18Z" fill="#c7d3ac"/>
    <path d="M12 12h3v5h-3m21-5h3v5h-3" fill="#e4b6a0"/>
    <path d="M13 30h22v9H13Z" fill="#e8dec2"/>
    <g className="pet-eyes normal-eyes"><path d="M16 22h3v5h-3m13-5h3v5h-3" fill="#344b3d"/><path d="M17 22h1v1h-1m13-1h1v1h-1" fill="white"/></g>
    <g className="faint-eyes" stroke="#344b3d" strokeWidth="2"><path d="m15 23 5 5m0-5-5 5m13-5 5 5m0-5-5 5"/></g>
    <path className="pet-brows" d="M14 19h8m5-1h8" stroke="#506749" strokeWidth="2"/>
    <path d="M23 29h3v2h-3m-2 3h7" stroke="#7a6553" strokeWidth="1"/>
    <g className="pet-glasses" fill="none" stroke="#69724d" strokeWidth="1.5"><path d="M12 21h10v7H12Zm14 0h10v7H26Zm-4 2h4"/></g>
    <path className="pet-arm left-arm" d="M8 29H4v8h6" fill="#a9bf93" stroke="#5d7664" strokeWidth="1"/>
    <path className="pet-arm right-arm" d="M40 29h4v8h-6" fill="#a9bf93" stroke="#5d7664" strokeWidth="1"/>
   </g>
   <g className="pet-book"><path d="M10 37h12l2 2 2-2h12v7H26l-2 2-2-2H10Z" fill="#71877b"/><path d="M12 38h10v5H12m14-5h10v5H26" fill="#f5edd2"/><path d="M24 39v6" stroke="#455d4c"/></g>
   <g className="pet-question"><path d="M35 3h7v3h-3v3h-2V5h3V4h-5Zm2 8h2v2h-2" fill="#a88649"/></g>
   <g className="pet-sweat" fill="#86bbca"><path d="m7 17-3 5v3h5v-3ZM42 13l-2 5v3h4v-3Z"/></g>
   <g className="pet-alert" fill="#bd755d"><path d="M23 2h3v7h-3Zm0 9h3v3h-3Z"/></g>
  </svg></div></div></div>
  {mood === "fainted" && <span className="revive-label">Look back to revive</span>}
 </div>;
}
