export function TopBar() {
  return (
    <div
      style={{
        width: "100%",
        height: 50,
        borderBottom: "1px solid #ced1d7",
        flexShrink: "0",
        display: "flex",
        alignItems: "center",
        padding: 16,
        justifyContent: "space-between",
      }}
    >
      <span>Satisfactory layout planner</span>
      <span>Github</span>
    </div>
  );
}
