import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applySeo } from "@/seo/client";

export default function SeoHead() {
  const { pathname } = useLocation();
  useEffect(() => applySeo(pathname), [pathname]);
  return null;
}
