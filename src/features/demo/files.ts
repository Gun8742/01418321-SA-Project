export const MAX_FILE_SIZE=5*1024*1024;
export async function validateDemoFile(file: File): Promise<string|null> {
  if(file.size>MAX_FILE_SIZE)return "ไฟล์ต้องมีขนาดไม่เกิน 5 MiB";
  const bytes=new Uint8Array(await file.slice(0,8).arrayBuffer());
  const signatures=[
    {mime:"application/pdf",extension:".pdf",bytes:[37,80,68,70,45]},
    {mime:"image/png",extension:".png",bytes:[137,80,78,71,13,10,26,10]},
    {mime:"image/jpeg",extension:".jpg",bytes:[255,216,255]},
  ];
  const valid=signatures.some(s=>s.mime===file.type&&(file.name.toLowerCase().endsWith(s.extension)||(s.mime==="image/jpeg"&&file.name.toLowerCase().endsWith(".jpeg")))&&s.bytes.every((v,i)=>bytes[i]===v));
  return valid?null:"รองรับเฉพาะ PDF, JPEG และ PNG ที่ชนิดไฟล์ตรงกับเนื้อหา";
}
