"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ModeToggle() {
    const { setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const handleClick = () => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    if (!mounted) {
        return (
            <button>
                <Sun className="h-[1.2rem] w-[1.2rem]" />
            </button>
        )
    }

    return (
        <button onClick={handleClick}>
            {resolvedTheme === "dark" ? (
                <Sun className="h-[1.2rem] w-[1.2rem] " />
            ) : (
                <Moon className="h-[1.2rem] w-[1.2rem]" />
            )}
        </button>
    )
}


