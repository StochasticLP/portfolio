export default function MeshcatViewer() {
  return (
    <div>
      <h2>My Tutorial</h2>
      <p>Explanation text...</p>

      {/* Embed Meshcat viewer */}
      <iframe
        src="http://localhost:8000"
        width="800"
        height="600"
        style={{ border: "2px solid #ccc" }}
      />

      <p>More tutorial content...</p>
    </div>
  );
}
