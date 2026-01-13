import path from 'path';
import { readMDXFile } from 'app/lib/posts';
import { CustomMDX } from 'app/components/mdx';
import DrakeSimLayout from './drake-sim-layout';

export default function Page() {
  const { content } = readMDXFile(path.join(process.cwd(), 'content', 'drake', 'drake-sim-intro.mdx'));

  return (
    <DrakeSimLayout initialControllers={['manual']}>
      <CustomMDX source={content} />
    </DrakeSimLayout>
  );
}
