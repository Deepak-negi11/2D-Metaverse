import Image from "next/image"
import Link from "next/link";
import { ModeToggle } from "./dark-mode";


export function Navbar() {
    return (
        <header className="sticky ">
            <div className="mx-auto max-w-7xl bg-blue-300 flex justify-between">
                <Image src={"/logo.jpg"} alt="left" width={32} height={32} />
                <div className=" flex items-center ">
                    <nav className="flex gap-2.5 font-mono">
                        <a href="#features" className="hover:text-primary">features</a>
                        <a href="/sigin" className="" >signin</a>
                        <a href="https://github.com/Deepak-negi11/2D-Metaverse" className="hover:text-primary">github</a>
                        <ModeToggle />
                    </nav>

                </div>

            </div>

        </header>
    );
}