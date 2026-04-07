import React from "react";
import { useSasUrl } from "../hooks/useSasUrl";

export default function SasImage({ src, alt, ...rest }) {
  const { url } = useSasUrl(src);
  // When SAS fetch is still pending, keep src to avoid layout shift; browser may fail but will swap once SAS arrives.
  return <img src={url || src || ""} alt={alt} {...rest} />;
}

