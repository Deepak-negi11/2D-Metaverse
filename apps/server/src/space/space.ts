import prisma from "@repo/db";
import { requireAuth } from "../middleware/auth";

export async function handleCreateSpace(req:Request):Promise<Response>{

    const auth = await requireAuth(req);
    if (auth instanceof Response){
        return auth
    }

    const body = await req.json().catch(()=>null);
    const {name , dimensions , mapId} = (body ?? {}) as {
        name?:string,
        dimensions?:string,
        mapId:string
    }
    if (!name || !dimensions ){
        return Response.json({
            message:"name and dimensions are required"
        },{
            status:400
        });
    };

    const [width , height] = String(dimensions).split("x").map(Number)
    if(!width || !height){
        return Response.json({
            message:"Invalid dimension"
        },{
            status:400
        })
    };
    if(!mapId){
        const space = await prisma.space.create({
            data:{
                name , width,height,creatorId:auth.userId
            }
        });
        return Response.json({
            spaceId:space.id
        })
    };

    const map = await prisma.map.findUnique({
        where:{id:mapId},
        include:{mapElements:true},
    });

    if(!map){
        return Response.json({message:"Map not found"},{status:400})
    }

    const space = await prisma.space.create({
        data:{
            name,
            width:map.width,
            height:map.height,
            creatorId:auth.userId,
            mapId:map.id,
            elements:{
                create: map.mapElements.filter((el)=> el.elementId && el.x!== null && el.y !==null)
                .map((el)=>({
                    elementId:el.elementId!,
                    x:el.x!,
                    y:el.y!
                })),
            }
        }
    });
    return Response.json({spaceId:space.id})
}


export async function handleDeleteSpace(req:Request):Promise<Response>{
    const auth = await requireAuth(req);
    if(auth instanceof Response){
        return auth
    };

    const spaceId = req.params.spaceId;

    const space = await prisma.space.findUnique({
        where:{
            id:spaceId
        }
    });
    if(!space){
        return Response.json({
            message:"Space not found"
        },{
            status:400
        })
    };
    if(space.creatorId !== auth.userId){
        return Response.json({message:"Not your space"},
            {
                status:403
            }
        )
    };
    await prisma.space.delete({ where: { id: spaceId } });
    return Response.json({ message: "Space deleted" });
}

// GET /api/v1/space/all — spaces owned by the logged-in user
export async function handleListSpaces(req: Request): Promise<Response> {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    const spaces = await prisma.space.findMany({
        where: { creatorId: auth.userId },
    });

    return Response.json({
        spaces: spaces.map((space) => ({
            id: space.id,
            name: space.name,
            dimensions: `${space.width}x${space.height}`,
            thumbnail: space.thumbnail,
        })),
    });
}

// GET /api/v1/space/:spaceId — one space with its placed elements
export async function handleGetSpace(req: Request): Promise<Response> {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    const spaceId = req.params.spaceId;

    const space = await prisma.space.findUnique({
        where: { id: spaceId },
        include: { elements: { include: { element: true } } },
    });
    if (!space) {
        return Response.json({ message: "Space not found" }, { status: 400 });
    }

    return Response.json({
        dimensions: `${space.width}x${space.height}`,
        elements: space.elements.map((se) => ({
            id: se.id,
            element: {
                id: se.element.id,
                imageUrl: se.element.imageUrl,
                width: se.element.width,
                height: se.element.height,
                static: se.element.static,
            },
            x: se.x,
            y: se.y,
        })),
    });
}

// POST /api/v1/space/element — place an element into a space at x,y
export async function handleAddElement(req: Request): Promise<Response> {
    const auth = await requireAuth(req);
    if (auth instanceof Response) return auth;

    const body = await req.json().catch(() => null);
    const { elementId, spaceId, x, y } = body ?? {};

    if (!elementId || !spaceId || typeof x !== "number" || typeof y !== "number") {
        return Response.json({ message: "Invalid request" }, { status: 400 });
    }

    const space = await prisma.space.findUnique({ where: { id: spaceId } });
    if (!space) {
        return Response.json({ message: "Space not found" }, { status: 400 });
    }

    if (x < 0 || y < 0 || x > space.width || y > space.height) {
        return Response.json({ message: "Out of bounds" }, { status: 400 });
    }

    await prisma.spaceElements.create({
        data: { elementId, spaceId, x, y },
    });

    return Response.json({ message: "Element added" });
}

export async function handleListElements(_req: Request): Promise<Response> {
    const elements = await prisma.elements.findMany();

    return Response.json({
        elements: elements.map((el) => ({
            id: el.id,
            imageUrl: el.imageUrl,
            width: el.width,
            height: el.height,
            static: el.static,
        })),
    });
}


