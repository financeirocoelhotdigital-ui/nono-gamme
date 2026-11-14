import React, { useEffect, useMemo, useState } from "react";
import { AvatarConfig, AvatarFrameStyle, UserProfile } from "../types";
import { avatarConfigToDataUri } from "../lib/avatarGenerator";
import { cn } from "../lib/utils";

interface UserAvatarProps {
  userProfile?: UserProfile | null;
  avatarConfig?: AvatarConfig | null;
  photoURL?: string;
  displayName?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  onClick?: () => void;
  title?: string;
}

const SIZE_CLASSES: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  xs: "w-8 h-8 text-xs",
  sm: "w-9 h-9 text-xs",
  md: "w-11 h-11 text-sm",
  lg: "w-14 h-14 text-base",
  xl: "w-20 h-20 text-xl",
  "2xl": "w-36 h-36 text-3xl",
};

function getFrameStyleProps(
  frameStyle?: AvatarFrameStyle,
  frameColor?: string
): React.CSSProperties {
  if (!frameStyle || frameStyle === "nenhuma") return {};
  const color = frameColor || "#10B981";

  if (frameStyle === "anel") {
    return {
      boxShadow: `0 0 0 2.5px #FFFFFF, 0 0 0 5px ${color}`,
    };
  }
  if (frameStyle === "duplo") {
    return {
      boxShadow: `0 0 0 2px ${color}, 0 0 0 4.5px #FFFFFF, 0 0 0 7px ${color}`,
    };
  }
  if (frameStyle === "destaque") {
    return {
      boxShadow: `0 0 0 3px ${color}, 0 8px 20px -4px ${color}66`,
    };
  }
  return {};
}

export function UserAvatar({
  userProfile,
  avatarConfig,
  photoURL,
  displayName,
  size = "md",
  className,
  onClick,
  title,
}: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const effectiveConfig = avatarConfig || userProfile?.avatarConfig;
  const effectiveName = displayName || userProfile?.displayName || "Usuário";
  const rawPhoto = photoURL !== undefined ? photoURL : userProfile?.photoURL;

  const resolvedSrc = useMemo(() => {
    if (rawPhoto && rawPhoto.trim()) {
      return rawPhoto.trim();
    }
    if (effectiveConfig) {
      return avatarConfigToDataUri(effectiveConfig, effectiveName);
    }
    return "";
  }, [rawPhoto, effectiveConfig, effectiveName]);

  useEffect(() => {
    setImgFailed(false);
  }, [resolvedSrc]);

  const initial = (effectiveName || "U").trim().charAt(0).toUpperCase() || "U";
  const frameStyle = getFrameStyleProps(
    effectiveConfig?.frameStyle,
    effectiveConfig?.frameColor
  );

  const content =
    resolvedSrc && !imgFailed ? (
      <img
        src={resolvedSrc}
        alt={`Avatar de ${effectiveName}`}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
      />
    ) : (
      <span className="font-bold tracking-tight select-none text-emerald-950">
        {initial}
      </span>
    );

  const sharedClasses = cn(
    "rounded-full overflow-hidden flex items-center justify-center bg-emerald-100 shrink-0 transition-transform",
    SIZE_CLASSES[size],
    onClick && "cursor-pointer hover:scale-105 active:scale-95",
    className
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={title || `Avatar de ${effectiveName}`}
        style={frameStyle}
        className={sharedClasses}
      >
        {content}
      </button>
    );
  }

  return (
    <div style={frameStyle} className={sharedClasses} title={title}>
      {content}
    </div>
  );
}
