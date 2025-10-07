
export default function MeshcatViewer(options) {
  return (
    <div>
      <iframe
        src="http://localhost:7000"
        width={options.width}
        height={options.height}
        style={{ border: "2px solid #ccc" }}
      />
    </div>
  );
};
