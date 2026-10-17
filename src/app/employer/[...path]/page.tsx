import { EmployerRouter } from "@/features/demo/employer-router";
export default async function EmployerPage({params}:{params:Promise<{path:string[]}>}) {const {path}=await params;return <EmployerRouter segments={path}/>;}
