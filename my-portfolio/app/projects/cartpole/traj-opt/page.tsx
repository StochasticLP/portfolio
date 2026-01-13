import path from 'path';
import { readMDXFile } from 'app/lib/posts';
import { CustomMDX } from 'app/components/mdx';
import DrakeSimLayout from '../drake-sim-layout';

export default function Page() {
  const { content } = readMDXFile(path.join(process.cwd(), 'content', 'drake-sim-traj-opt.mdx'));

  return (
    <DrakeSimLayout initialControllers={['traj-opt']}>
      <CustomMDX source={content} />
    </DrakeSimLayout>
  );
}
