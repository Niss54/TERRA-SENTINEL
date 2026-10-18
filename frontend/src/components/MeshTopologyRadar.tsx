import React, { useState, useEffect } from "react";
import { Radio, RefreshCw, Zap } from "lucide-react";

export interface DuckNode {
  duck_id: string;
  duck_type: "DuckLink" | "MamaDuck" | "PapaDuck";
  name: string;
  lat: number;
  lon: number;
  battery_pct: number;
  status: "HEALTHY" | "WARNING" | "CRITICAL" | "SOS_ALERT";
  last_seen: string;
  last_rssi: number;
  water_level_cm?: number;
  total_packets_routed: number;
}

export interface MeshLink {
  source: string;
  target: string;
  rssi: number;
  quality: "EXCELLENT" | "GOOD" | "MARGINAL" | "CRITICAL";
}

export interface MeshTopology {
  nodes: DuckNode[];
  links: MeshLink[];
  total_active_nodes: number;
  active_sos_alerts: number;
  average_mesh_delivery_rate: number;
  dead_zones_detected: string[];
  gateway_status: string;
}

export const MeshTopologyRadar: React.FC = () => {
  const [topology, setTopology] = useState<MeshTopology | null>(null);
  const [selectedNode, setSelectedNode] = useState<DuckNode | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [sosInProgress, setSosInProgress] = useState<boolean>(false);
  const [lastSosEvent, setLastSosEvent] = useState<any | null>(null);

  const fetchTopology = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/v1/mesh/topology");
      if (resp.ok) {
        const data: MeshTopology = await resp.json();
        setTopology(data);
        if (!selectedNode && data.nodes.length > 0) {
          setSelectedNode(data.nodes[0]);
        }
      }
    } catch (err) {
      console.warn("Could not fetch mesh topology:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopology();
    const interval = setInterval(fetchTopology, 8000);
    return () => clearInterval(interval);
  }, []);

  const triggerSosSimulation = async () => {
    setSosInProgress(true);
    try {
      const resp = await fetch("/api/v1/mesh/simulate-sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_duck_id: "DUCK-ISOLATED-07",
          location_name: "Kurla West Submerged Slum Cluster",
          lat: 19.071,
          lon: 72.882,
          water_level_cm: 155.0,
          civilians_trapped: 32,
          urgency: "IMMEDIATE_AIRLIFT_RESCUE"
        })
      });
      if (resp.ok) {
        const result = await resp.json();
        setLastSosEvent(result);
        await fetchTopology();
      }
    } catch (err) {
      console.error("SOS simulation failed:", err);
    } finally {
      setSosInProgress(false);
    }
  };

  const getNodeColor = (status: string, type: string) => {
    if (status === "SOS_ALERT") return "#ef4444";
    if (type === "PapaDuck") return "#3b82f6";
    if (type === "MamaDuck") return "#10b981";
    return "#f59e0b";
  };

  return (
    <div className="glass-card" style={{ padding: "20px", marginBottom: "20px", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="badge" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
              CLUSTERDUCK PROTOCOL
            </span>
            <h3 style={{ fontSize: "1.1rem", color: "#FFF", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
              <Radio size={18} style={{ color: "#f87171" }} />
              LoRa Ad-Hoc Emergency Mesh Radar & Gateway
            </h3>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>
            Off-grid telemetry mesh network with loop prevention (H ≤ 6), deduplication, and direct rescue dispatch.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={triggerSosSimulation}
            disabled={sosInProgress}
            className="btn"
            style={{
              background: "linear-gradient(135deg, #ef4444, #b91c1c)",
              color: "#FFF",
              fontWeight: 700,
              fontSize: "0.75rem",
              padding: "6px 12px",
              boxShadow: "0 0 14px rgba(239, 68, 68, 0.5)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              border: "none",
              cursor: "pointer"
            }}
          >
            <Zap size={14} className={sosInProgress ? "spin" : ""} />
            {sosInProgress ? "DISPATCHING SOS..." : "SIMULATE OFF-GRID SOS"}
          </button>

          <button
            onClick={fetchTopology}
            disabled={loading}
            className="btn btn-secondary"
            style={{ padding: "6px 10px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
          >
            <RefreshCw size={12} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {/* SOS Alert Banner */}
      {topology && topology.active_sos_alerts > 0 && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid #ef4444",
            padding: "10px 14px",
            borderRadius: "8px",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 8px #ef4444", animation: "pulse 1s infinite" }} />
            <div>
              <span style={{ fontWeight: 800, color: "#f87171", fontSize: "0.85rem", letterSpacing: "0.03em" }}>
                CRITICAL OFF-GRID SOS BROADCAST RECEIVED
              </span>
              <div style={{ fontSize: "0.75rem", color: "#fca5a5" }}>
                {lastSosEvent?.message || "Active emergency evacuation beacon detected over multi-hop LoRa mesh. Cellular grid offline."}
              </div>
            </div>
          </div>
          <span className="badge" style={{ background: "#ef4444", color: "#FFF", fontWeight: 800 }}>
            {topology.active_sos_alerts} RESCUE BEACON ACTIVE
          </span>
        </div>
      )}

      {/* Radar Map & Node Inspector Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "16px" }}>
        {/* SVG Mesh Topology Visualizer */}
        <div
          style={{
            position: "relative",
            height: "300px",
            background: "radial-gradient(circle at center, #111d33 0%, #060b14 100%)",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            overflow: "hidden"
          }}
        >
          {/* Radar Circles */}
          <svg style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
            <circle cx="50%" cy="50%" r="40" stroke="rgba(255,255,255,0.06)" fill="none" />
            <circle cx="50%" cy="50%" r="80" stroke="rgba(255,255,255,0.06)" fill="none" />
            <circle cx="50%" cy="50%" r="120" stroke="rgba(255,255,255,0.06)" fill="none" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke="rgba(255,255,255,0.05)" />
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke="rgba(255,255,255,0.05)" />

            {/* Links */}
            {topology?.links.map((link, idx) => {
              const srcNode = topology.nodes.find((n) => n.duck_id === link.source);
              const dstNode = topology.nodes.find((n) => n.duck_id === link.target);
              if (!srcNode || !dstNode) return null;

              // Normalized coordinates to canvas
              const srcX = `${25 + ((idx * 37) % 50)}%`;
              const srcY = `${30 + ((idx * 23) % 40)}%`;
              const dstX = "50%";
              const dstY = "50%";

              return (
                <line
                  key={idx}
                  x1={srcX}
                  y1={srcY}
                  x2={dstX}
                  y2={dstY}
                  stroke={link.quality === "EXCELLENT" ? "#10b981" : link.quality === "GOOD" ? "#f59e0b" : "#ef4444"}
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  opacity="0.6"
                />
              );
            })}
          </svg>

          {/* Node Points on Radar */}
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            {topology?.nodes.map((node, i) => {
              const isSelected = selectedNode?.duck_id === node.duck_id;
              // Deterministic layout distribution
              const leftPct = node.duck_type === "PapaDuck" ? 50 : 20 + ((i * 31) % 60);
              const topPct = node.duck_type === "PapaDuck" ? 50 : 25 + ((i * 29) % 55);

              return (
                <div
                  key={node.duck_id}
                  onClick={() => setSelectedNode(node)}
                  style={{
                    position: "absolute",
                    left: `${leftPct}%`,
                    top: `${topPct}%`,
                    transform: "translate(-50%, -50%)",
                    cursor: "pointer",
                    textAlign: "center",
                    zIndex: isSelected ? 20 : 10
                  }}
                >
                  <div
                    style={{
                      width: node.duck_type === "PapaDuck" ? "22px" : "16px",
                      height: node.duck_type === "PapaDuck" ? "22px" : "16px",
                      borderRadius: node.duck_type === "MamaDuck" ? "4px" : "50%",
                      background: getNodeColor(node.status, node.duck_type),
                      border: isSelected ? "3px solid #FFF" : "2px solid rgba(255,255,255,0.4)",
                      boxShadow: `0 0 ${node.status === "SOS_ALERT" ? "16px #ef4444" : "8px rgba(0,0,0,0.6)"}`,
                      margin: "0 auto",
                      transition: "transform 0.2s ease"
                    }}
                  />
                  <div
                    className="mono"
                    style={{
                      fontSize: "0.62rem",
                      color: isSelected ? "#FFF" : "rgba(255,255,255,0.7)",
                      background: "rgba(0,0,0,0.75)",
                      padding: "1px 4px",
                      borderRadius: "3px",
                      marginTop: "3px",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {node.duck_id}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ position: "absolute", bottom: "8px", left: "10px", fontSize: "0.68rem", color: "#64748b" }}>
            ● PapaDuck Gateway (Center) • ▲ MamaDuck Relay • ● DuckLink Sensor
          </div>
        </div>

        {/* Selected Node Details Drawer */}
        <div style={{ background: "rgba(255, 255, 255, 0.03)", padding: "14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>TELEMETRY NODE INSPECTOR</div>
          {selectedNode ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span className="mono" style={{ fontSize: "1rem", fontWeight: 800, color: "#FFF" }}>
                  {selectedNode.duck_id}
                </span>
                <span
                  className="badge"
                  style={{
                    background: selectedNode.status === "SOS_ALERT" ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)",
                    color: selectedNode.status === "SOS_ALERT" ? "#f87171" : "#34d399",
                    border: `1px solid ${selectedNode.status === "SOS_ALERT" ? "#ef4444" : "#10b981"}`
                  }}
                >
                  {selectedNode.status}
                </span>
              </div>

              <div style={{ fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "10px" }}>{selectedNode.name}</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.72rem" }}>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: "6px" }}>
                  <div style={{ color: "var(--color-text-muted)" }}>Node Role</div>
                  <div className="mono" style={{ fontWeight: 700, color: "#FFF" }}>{selectedNode.duck_type}</div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: "6px" }}>
                  <div style={{ color: "var(--color-text-muted)" }}>Signal (RSSI)</div>
                  <div className="mono" style={{ fontWeight: 700, color: selectedNode.last_rssi > -80 ? "#34d399" : "#fbbf24" }}>
                    {selectedNode.last_rssi} dBm
                  </div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: "6px" }}>
                  <div style={{ color: "var(--color-text-muted)" }}>Battery Level</div>
                  <div className="mono" style={{ fontWeight: 700, color: selectedNode.battery_pct > 30 ? "#34d399" : "#f87171" }}>
                    {selectedNode.battery_pct.toFixed(1)}%
                  </div>
                </div>

                <div style={{ background: "rgba(0,0,0,0.3)", padding: "6px 8px", borderRadius: "6px" }}>
                  <div style={{ color: "var(--color-text-muted)" }}>Water Level</div>
                  <div className="mono" style={{ fontWeight: 700, color: (selectedNode.water_level_cm || 0) > 100 ? "#f87171" : "#60a5fa" }}>
                    {selectedNode.water_level_cm || 0} cm
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "0.68rem", color: "var(--color-text-muted)" }}>
                Total Packets Routed: <b style={{ color: "#FFF" }}>{selectedNode.total_packets_routed}</b> • Max Hops: <b style={{ color: "#FFF" }}>6</b>
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--color-text-muted)", fontSize: "0.78rem" }}>Click any radar node to inspect diagnostics.</div>
          )}
        </div>
      </div>

      {/* Dead Zones & Delivery Summary Footer */}
      {topology && (
        <div style={{ marginTop: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "var(--color-text-muted)", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
          <div>
            Mesh Backhaul Delivery Rate: <b style={{ color: "#34d399" }}>{topology.average_mesh_delivery_rate}%</b> • Gateway: <b style={{ color: "#60a5fa" }}>{topology.gateway_status}</b>
          </div>
          <div style={{ color: "#fca5a5" }}>
            Dead-Zone Alerts: {topology.dead_zones_detected[0]}
          </div>
        </div>
      )}
    </div>
  );
};
