import prisma from "@repo/db";
import { requireAuth } from "../middleware/auth";

async function requireAdmin(req: Request): Promise<{ userId: string } | Response> {
  const auth = requireAuth(req);
  if (auth instanceof Response) {
    return auth;
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
  });

  if (!user || user.role !== "Admin") {
    return Response.json({ message: "Admin only" }, { status: 403 });
  }

  return { userId: auth.userId };
}

export async function handleCreateElement(req:Request): Promise<Response>{
    const admin = await requireAdmin(req);
    if(admin instanceof Response){
        return admin
    }
    const body = await req.json().catch(()=> null);
    const {imageUrl , width , height , static:isStatic}= (body ?? {}) as {
        imageUrl?: string;
        width?: number;
        height?: number;
        static?: boolean;
    };
     if (!imageUrl || typeof width !== "number" || typeof height !== "number") {
          return Response.json({ message: "Invalid element" }, { status: 400 });
   }

   const element = await prisma.elements.create({
    data:{
        imageUrl , width , height , static: Boolean(isStatic)
    }
   })
   return Response.json({id:element.id})
}

export async function handleCreateAvatar(req:Request): Promise<Response>{
    const admin =await  requireAdmin(req)

    if(admin instanceof Response){
        return admin
    }
    const body = await req.json().catch(()=>null);
    const { imageUrl , name } = (body ?? {}) as {
        imageUrl?:string,
        name?:string
    }
    if( !imageUrl || !name){
        return Response.json({ message:"Invalid avatar"},{status:400})
    }

   const avatar =await prisma.avatar.create({
    data:{
        imageUrl, name
    }
   });

    return Response.json({avatarId: avatar.id});

}

export async function handleCreateMap(req:Request):Promise<Response>{
    const admin = await requireAdmin(req);
    if(admin instanceof Response){
        return admin
    }
    const body = await req.json().catch(()=>null);
    const {thumbnail , dimensions , name , defaultElements} = (body ?? {}) as {
        thumbnail?:string,
        dimensions?:string,
        name?:string,
        defaultElements?: Array<{elementId:string;x:number;y:number}>
    }

    // thumbnail is optional per spec; name + dimensions are required
    if(!name || !dimensions){
        return Response.json({
            message:"Invalid map"
        },{
            status:400
        })
    };

    const [width , height] = dimensions.split("x").map(Number);

    if(!width || !height){
        return Response.json({
            message:"Invalid dimension"
        },{
            status:400
        })
    };

    const map = await prisma.map.create({
        data:{
            name,
            width,
            height,
            thumbnail,
            mapElements:{
                create: (defaultElements ?? []).map((el:{elementId:string;x:number ; y:number})=>({
                    elementId:el.elementId,
                    x:el.x,
                    y:el.y
                })),
            }
        }
    })

    return Response.json({id:map.id})

}