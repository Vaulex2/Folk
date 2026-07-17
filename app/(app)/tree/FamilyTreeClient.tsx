"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { Option } from "@/lib/options";
import { useT } from "@/components/I18nProvider";

export interface TreeNode {
  id: number;
  tag: string;
  sexLabel: string;
  sexWithLamb: string;
  breed: string;
  ageLabel: string;
  health: string;
  healthLabel: string;
  hsBg: string;
  hsFg: string;
  photoUrl: string | null;
}

function NodeButton({ node, role, onTree }: { node: TreeNode; role: string; onTree: (id: number) => void }) {
  return (
    <button className="node" type="button" onClick={() => onTree(node.id)}>
      {node.photoUrl && <Image className="node-photo" src={node.photoUrl} alt="" width={28} height={28} />}
      <span className="node-tag">{node.tag}</span>
      <span className="node-meta">{role} · {node.ageLabel}</span>
      <span className="node-hs" style={{ background: node.hsBg, color: node.hsFg }}>{node.healthLabel}</span>
    </button>
  );
}

/** Compact ancestor node for the grandparent rows: tag + health dot. */
function MiniNode({ node, title, onTree }: { node: TreeNode; title: string; onTree: (id: number) => void }) {
  return (
    <button className="node mini" type="button" title={`${title} · ${node.sexLabel}`} onClick={() => onTree(node.id)}>
      <span className="node-tag">
        <span className="node-dot" style={{ background: node.hsFg }} />
        {node.tag}
      </span>
    </button>
  );
}

export default function FamilyTreeClient({
  focal,
  ancestors,
  kids,
  options,
  roleSire,
  roleDam,
  genLabels,
  unknownLabel,
}: {
  focal: TreeNode;
  /** Level 0 = parents [sire, dam]; level 1 = grandparents (4); level 2 = great-grandparents (8). */
  ancestors: (TreeNode | null)[][];
  kids: TreeNode[];
  options: Option[];
  roleSire: string;
  roleDam: string;
  /** Labels for levels 1+ (grandparent, great-grandparent). */
  genLabels: string[];
  unknownLabel: string;
}) {
  const router = useRouter();
  const t = useT();
  const recentre = (id: number) => router.push(`/tree?focus=${id}`);
  const hasParents = ancestors.length > 0 && ancestors[0].some(Boolean);
  const hasKids = kids.length > 0;

  const cols = ancestors.length > 0 ? ancestors[ancestors.length - 1].length : 1;

  // A slot connects upward when at least one of its two parents is shown above it.
  const hasUp = (level: number, i: number) =>
    level + 1 < ancestors.length &&
    Boolean(ancestors[level + 1][2 * i] || ancestors[level + 1][2 * i + 1]);

  function slot(level: number, i: number) {
    const a = ancestors[level][i];
    const span = cols / ancestors[level].length;
    // Hide a fully-unknown pair: no placeholder boxes where nothing connects below.
    const pairKnown = Boolean(ancestors[level][i - (i % 2)] || ancestors[level][i - (i % 2) + 1]);
    const up = a != null && hasUp(level, i);
    const classes = `anc-slot${up ? " has-up" : ""}`;
    const style = { gridColumn: `span ${span}` };
    if (!pairKnown) return <div key={i} style={style} />;
    return (
      <div key={i} className={classes} style={style}>
        {a ? (
          level === 0 ? (
            <NodeButton node={a} role={i === 0 ? roleSire : roleDam} onTree={recentre} />
          ) : (
            <MiniNode node={a} title={genLabels[level - 1] ?? ""} onTree={recentre} />
          )
        ) : (
          <div className="node mini void">
            <span className="node-tag">—</span>
            <span className="node-meta">{unknownLabel}</span>
          </div>
        )}
        <span className="dstem" />
      </div>
    );
  }

  return (
    <>
      <div className="pagehead headrow">
        <div>
          <h1>{t("tree.title")}</h1>
          <p>{t("tree.subtitle")}</p>
        </div>
        <select
          className="input"
          style={{ minWidth: 230, maxWidth: "100%" }}
          value={String(focal.id)}
          onChange={(e) => recentre(parseInt(e.target.value, 10))}
        >
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div className="panel">
        <div className="ped">
          <div className="ped-inner">
            {hasParents ? (
              <div className="anc-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(76px, 1fr))` }}>
                {ancestors
                  .map((_, level) => level)
                  .reverse()
                  .map((level) =>
                    ancestors[level].map((_, i) => slot(level, i))
                  )}
                <div className="anc-slot focal-slot has-up" style={{ gridColumn: `1 / -1` }}>
                  <div className="node focal">
                    {focal.photoUrl && <Image className="node-photo" src={focal.photoUrl} alt="" width={28} height={28} />}
                    <span className="node-tag">{focal.tag}</span>
                    <span className="node-meta">{focal.sexWithLamb} · {focal.breed} · {focal.ageLabel}</span>
                    <span className="node-hs" style={{ background: focal.hsBg, color: focal.hsFg }}>{focal.healthLabel}</span>
                  </div>
                  {hasKids && <span className="dstem" />}
                </div>
              </div>
            ) : (
              <>
                <div className="ped-note">{t("tree.founder")}</div>
                <div className={`focal-wrap${hasKids ? " has-drop" : ""}`}>
                  <div className="node focal">
                    {focal.photoUrl && <Image className="node-photo" src={focal.photoUrl} alt="" width={28} height={28} />}
                    <span className="node-tag">{focal.tag}</span>
                    <span className="node-meta">{focal.sexWithLamb} · {focal.breed} · {focal.ageLabel}</span>
                    <span className="node-hs" style={{ background: focal.hsBg, color: focal.hsFg }}>{focal.healthLabel}</span>
                  </div>
                </div>
              </>
            )}

            {hasKids ? (
              <ul className="tree-row kids">
                {kids.map((k) => (
                  <li key={k.id}><NodeButton node={k} role={k.sexLabel} onTree={recentre} /></li>
                ))}
              </ul>
            ) : (
              <div className="ped-note" style={{ marginTop: 6 }}>{t("tree.noOffspringYet")}</div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <Link className="btn btn-ghost" href={`/sheep/${focal.id}`}>{t("tree.openProfile", { tag: focal.tag })}</Link>
        </div>
      </div>
    </>
  );
}
