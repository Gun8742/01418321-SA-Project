import { WorkerRouter } from "@/features/demo/worker-router";
export default async function WorkerPage({params}:{params:Promise<{section:string}>}) {const {section}=await params;return <WorkerRouter section={section}/>;}
