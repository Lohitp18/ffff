import React from "react";
import { useSasUrl } from "../hooks/useSasUrl";

export default function SasVideo({ src, ...rest }) {
  const { url } = useSasUrl(src);
  return <video src={url || src || ""} {...rest} />;
}

