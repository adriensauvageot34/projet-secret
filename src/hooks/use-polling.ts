"use client";
import { useEffect } from "react";
export function usePolling(cb:()=>void,ms:number){useEffect(()=>{cb();const id=setInterval(cb,ms);return ()=>clearInterval(id);},[cb,ms]);}
