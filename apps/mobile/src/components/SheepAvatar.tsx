import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors, font, radius } from "../theme";

interface Props {
  photoUrl: string | null;
  tag: string;
  size?: number;
}

// Round photo, or a tag-initial fallback tile when no photo is set.
export function SheepAvatar({ photoUrl, tag, size = 48 }: Props) {
  const dim = { width: size, height: size, borderRadius: radius.md };
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={[styles.img, dim]} />;
  }
  return (
    <View style={[styles.fallback, dim]}>
      <Text style={[styles.initial, { fontSize: size * 0.36 }]}>{tag.slice(0, 3)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: colors.surfaceAlt },
  fallback: { backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  initial: { color: colors.primaryDark, fontWeight: "700" },
});
