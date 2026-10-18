import React, { useState, useEffect } from "react";
import { Navigation, RefreshCw, Send, Zap } from "lucide-react";

export interface EvacuationWaypoint {
  node_id: string;
  name: string;
  lat: number;
  lon: number;
  elevation_m: number;
  current_water_depth_cm: number;
  is_safe_haven: boolean;
}

export interface EvacuationRoute {
  route_id: string;
  vehicle_type: string;
  origin_name: string;
  destination_shelter: string;
  total_distance_km: number;
  estimated_time_min: number;
  waypoints: EvacuationWaypoint[];
  impassable_segments_avoided: number;
  max_depth_encountered_cm: number;
  safety_rating: string;
  turn_by_turn: string[];
  execution_time_ms: number;
}

export interface FleetUnit {
  unit_id: string;
  unit_type: string;
  name: string;
  lat: number;
  lon: number;
  status: string;
  capacity_persons: number;
  fuel_or_battery_pct: number;
  assigned_sector: string;
  last_ping: string;
}

export const EvacuationFleetCockpit: React.FC = () => {
  const [vehicleType, setVehicleType] = useState<string>("Emergency Ambulance");
  const [civiliansCount, setCiviliansCount] = useState<number>(35);
  const [route, setRoute] = useState<EvacuationRoute | null>(null);
  const [fleet, setFleet] = useState<FleetUnit[]>([]);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(false);
  const [loadingFleet, setLoadingFleet] = useState<boolean>(false);
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);

  // Parametric Oracle State
  const [oracleResult, setOracleResult] = useState<any | null>(null);
  const [oracleLoading, setOracleLoading] = useState<boolean>(false);

  const fetchRoute = async () => {
    setLoadingRoute(true);
    try {
      const resp = await fetch("/api/v1/evacuation/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_name: "Kurla West Lowland Cluster",
          origin_lat: 19.0685,
          origin_lon: 72.8792,
          vehicle_type: vehicleType,
          civilians_count: civiliansCount,
          max_acceptable_risk: "MEDIUM"
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        setRoute(data);
      }
    } catch (err) {
      console.warn("Could not fetch evacuation route:", err);
    } finally {
      setLoadingRoute(false);
    }
  };

  const fetchFleet = async () => {
    setLoadingFleet(true);
    try {
      const resp = await fetch("/api/v1/evacuation/fleet");
      if (resp.ok) {
        const data = await resp.json();
        setFleet(data);
      }
    } catch (err) {
      console.warn("Could not fetch fleet:", err);
    } finally {
      setLoadingFleet(false);
    }
  };

  const handleDispatchFleet = async () => {
    try {
      const resp = await fetch("/api/v1/evacuation/fleet-dispatch?target_sector=Kurla+West+Lowlands", {
        method: "POST"
      });
      if (resp.ok) {
        const data = await resp.json();
        setDispatchStatus(data.message);
        await fetchFleet();
      }
    } catch (err) {
      console.error("Fleet dispatch failed:", err);
    }
  };

  const handleExecuteParametricPayout = async () => {
    setOracleLoading(true);
    try {
      const resp = await fetch("/api/v1/oracle/auto-payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: `EVT-ORACLE-PAYOUT-${Date.now()}`,
          location_name: "Mumbai Mithi River Basin",
          lora_depth_cm: 145.0,
          clay_flood_prob: 0.89,
          veda_inundated_sqkm: 12.8,
          total_beneficiaries: 120,
          payout_per_beneficiary_inr: 25000.0
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        setOracleResult(data);
      }
    } catch (err) {
      console.error("Parametric payout failed:", err);
    } finally {
      setOracleLoading(false);
    }
  };

  useEffect(() => {
    fetchRoute();
    fetchFleet();
  }, [vehicleType, civiliansCount]);

  return (
    <div className="glass-card" style={{ padding: "20px", marginBottom: "20px", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="badge" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
              AUTONOMOUS RESCUE DISPATCH
            </span>
            <h3 style={{ fontSize: "1.1rem", color: "#FFF", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
              <Navigation size={18} style={{ color: "#60a5fa" }} />
              Disaster Evacuation Routing & Fleet Operations
            </h3>
          </div>
          <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", margin: "4px 0 0 0" }}>
            A* dynamic water-depth obstacle avoidance, NDRF rescue boat mobilization, and multi-sensor parametric auto-payouts.
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={handleDispatchFleet}
            className="btn"
            style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#FFF",
              fontWeight: 700,
              fontSize: "0.75rem",
              padding: "6px 12px",
              boxShadow: "0 0 12px rgba(37, 99, 235, 0.4)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              border: "none",
              cursor: "pointer"
            }}
          >
            <Send size={14} />
            MOBILIZE NDRF RESCUE FLEET
          </button>
        </div>
      </div>

      {dispatchStatus && (
        <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10b981", color: "#34d399", padding: "8px 12px", borderRadius: "6px", fontSize: "0.75rem", marginBottom: "14px" }}>
          ✓ {dispatchStatus}
        </div>
      )}

      {/* Main 2-Column Operational Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px" }}>
        {/* Left Column: Evacuation Route & Waypoint Corridor */}
        <div style={{ background: "rgba(0, 0, 0, 0.35)", padding: "14px", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#93c5fd" }}>SAFE EVACUATION CORRIDOR</span>
            <div style={{ display: "flex", gap: "6px" }}>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                style={{
                  background: "rgba(0,0,0,0.6)",
                  color: "#FFF",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "4px",
                  fontSize: "0.72rem",
                  padding: "3px 6px"
                }}
              >
                <option value="Emergency Ambulance">Emergency Ambulance (40cm)</option>
                <option value="Municipal Rescue Bus">Municipal Rescue Bus (65cm)</option>
                <option value="NDRF Inflatable Rescue Boat">NDRF Rescue Boat (Amphibious)</option>
                <option value="Pedestrian">Pedestrian Safe Footpath (15cm)</option>
              </select>
              <input
                type="number"
                min="5"
                max="250"
                value={civiliansCount}
                onChange={(e) => setCiviliansCount(Number(e.target.value))}
                title="Civilians headcount"
                style={{
                  width: "55px",
                  background: "rgba(0,0,0,0.6)",
                  color: "#FFF",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "4px",
                  fontSize: "0.72rem",
                  padding: "3px 6px"
                }}
              />
              <button
                onClick={fetchRoute}
                disabled={loadingRoute}
                className="btn-secondary"
                style={{ padding: "3px 8px", fontSize: "0.72rem" }}
              >
                <RefreshCw size={11} className={loadingRoute ? "spin" : ""} />
              </button>
            </div>
          </div>

          {route ? (
            <div>
              {/* Route Summary Metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px", marginBottom: "12px" }}>
                <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px", borderRadius: "6px" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>Total Distance</div>
                  <div className="mono" style={{ fontWeight: 700, color: "#FFF", fontSize: "1rem" }}>
                    {route.total_distance_km} <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>km</span>
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px", borderRadius: "6px" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>Transit Time</div>
                  <div className="mono" style={{ fontWeight: 700, color: "#34d399", fontSize: "1rem" }}>
                    {route.estimated_time_min} <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>min</span>
                  </div>
                </div>

                <div style={{ background: "rgba(255,255,255,0.03)", padding: "8px", borderRadius: "6px" }}>
                  <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>Submerged Avoided</div>
                  <div className="mono" style={{ fontWeight: 700, color: "#fbbf24", fontSize: "1rem" }}>
                    {route.impassable_segments_avoided} links
                  </div>
                </div>
              </div>

              {/* Waypoints Flow */}
              <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: "6px" }}>
                TRANSIT WAYPOINTS & WATER CLEARANCE:
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                {route.waypoints.map((wp, idx) => (
                  <div
                    key={wp.node_id}
                    style={{
                      background: wp.is_safe_haven ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.03)",
                      border: wp.is_safe_haven ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.05)",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <span className="mono" style={{ color: wp.is_safe_haven ? "#34d399" : "#60a5fa", fontWeight: 700, marginRight: "6px" }}>
                        #{idx + 1}
                      </span>
                      <span style={{ color: "#FFF", fontWeight: wp.is_safe_haven ? 700 : 400 }}>{wp.name}</span>
                    </div>
                    <div className="mono" style={{ fontSize: "0.68rem", color: wp.current_water_depth_cm > 20 ? "#fbbf24" : "#34d399" }}>
                      Elevation: {wp.elevation_m}m • Depth: {wp.current_water_depth_cm}cm
                    </div>
                  </div>
                ))}
              </div>

              {/* Turn-by-Turn Guidance */}
              <div style={{ background: "rgba(0,0,0,0.4)", padding: "8px 10px", borderRadius: "6px", fontSize: "0.7rem", color: "#cbd5e1" }}>
                <div style={{ fontWeight: 700, color: "#93c5fd", marginBottom: "4px" }}>TACTICAL ROUTE INSTRUCTIONS:</div>
                {route.turn_by_turn.map((instr, i) => (
                  <div key={i} style={{ margin: "2px 0" }}>{instr}</div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>Calculating optimal evacuation corridor...</div>
          )}
        </div>

        {/* Right Column: Live Fleet Units & Parametric Oracle Trigger */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Active Fleet Units */}
          <div style={{ background: "rgba(0,0,0,0.35)", padding: "14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#93c5fd" }}>RESCUE FLEET UNITS ({fleet.length})</span>
              <button onClick={fetchFleet} className="btn-secondary" style={{ padding: "2px 6px", fontSize: "0.68rem" }}>
                <RefreshCw size={10} className={loadingFleet ? "spin" : ""} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "170px", overflowY: "auto" }}>
              {fleet.map((unit) => (
                <div
                  key={unit.unit_id}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "0.72rem"
                  }}
                >
                  <div>
                    <div style={{ color: "#FFF", fontWeight: 700 }}>{unit.name}</div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: "0.65rem" }}>
                      {unit.unit_type} • Cap: {unit.capacity_persons}p
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      className="badge"
                      style={{
                        background: unit.status === "DISPATCHED" ? "rgba(59, 130, 246, 0.2)" : "rgba(16, 185, 129, 0.2)",
                        color: unit.status === "DISPATCHED" ? "#60a5fa" : "#34d399",
                        fontSize: "0.62rem"
                      }}
                    >
                      {unit.status}
                    </span>
                    <div className="mono" style={{ color: "#94a3b8", fontSize: "0.65rem", marginTop: "2px" }}>
                      Fuel: {unit.fuel_or_battery_pct}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tripartite Parametric Catastrophe Oracle Payout Box */}
          <div style={{ background: "rgba(234, 88, 12, 0.08)", padding: "14px", borderRadius: "8px", border: "1px solid rgba(234, 88, 12, 0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#fb923c" }}>
                MULTI-SENSOR PARAMETRIC ORACLE (POLYGON)
              </span>
              <span className="badge" style={{ background: "#ea580c", color: "#FFF", fontSize: "0.6rem" }}>
                WEB3 AUTO-SETTLEMENT
              </span>
            </div>

            <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginBottom: "10px" }}>
              Tripartite Invariant: <b>LoRa Depth ≥ 100cm</b> &bull; <b>Clay ViT Prob ≥ 70%</b> &bull; <b>VEDA Area ≥ 5km²</b>
            </div>

            <button
              onClick={handleExecuteParametricPayout}
              disabled={oracleLoading}
              className="btn"
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #ea580c, #c2410c)",
                color: "#FFF",
                fontWeight: 700,
                fontSize: "0.75rem",
                padding: "8px",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 0 12px rgba(234, 88, 12, 0.4)"
              }}
            >
              <Zap size={14} className={oracleLoading ? "spin" : ""} />
              {oracleLoading ? "EXECUTING ON-CHAIN PAYOUT..." : "EXECUTE AUTO-PAYOUT (₹30 LAKHS)"}
            </button>

            {oracleResult && (
              <div style={{ marginTop: "10px", padding: "8px", background: "rgba(0,0,0,0.5)", borderRadius: "6px", fontSize: "0.68rem" }}>
                <div style={{ color: "#34d399", fontWeight: 700, marginBottom: "2px" }}>
                  ✓ SETTLEMENT CONFIRMED ON POLYGON AMOY
                </div>
                <div className="mono" style={{ color: "#94a3b8" }}>
                  Tx: {oracleResult.polygon_tx_hash.slice(0, 16)}...
                </div>
                <div className="mono" style={{ color: "#94a3b8" }}>
                  IPFS: {oracleResult.ipfs_cid.slice(0, 16)}...
                </div>
                <div style={{ color: "#FFF", marginTop: "2px" }}>
                  Total Paid: ₹{oracleResult.total_payout_amount_inr.toLocaleString()} across {oracleResult.total_beneficiaries_paid} wallets
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
