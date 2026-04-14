"use client";
import { useEffect, useState } from "react";
import { secondsUntil } from "@/utils/timers";
export function useCountdown(targetIso?: string){const [left,setLeft]=useState(targetIso?secondsUntil(targetIso):0);useEffect(()=>{if(!targetIso)return;const id=setInterval(()=>setLeft(secondsUntil(targetIso)),1000);return ()=>clearInterval(id);},[targetIso]);return left;}
