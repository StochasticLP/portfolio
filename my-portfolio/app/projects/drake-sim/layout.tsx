import ResizableLayout from "./resizeable-layout";
 
export default function Layout({ children }: { children: React.ReactNode }) {
    return (
      <div><ResizableLayout pages={[children]}/></div>
  );
}
