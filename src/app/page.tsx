import { auth } from "@clerk/nextjs/server";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";
import { CinematicFooter } from "@/components/ui/motion-footer";
import { Button } from "@/components/ui/button";
import { SignInButton, GetStartedButton } from "@/components/LandingNavButtons";
import Image from "next/image";
import Link from "next/link";
import { Wine, ArrowRight } from "lucide-react";

export default async function Home() {
  const { userId } = await auth();
  const user = userId; // Fallback mapping for the rest of the file

  return (
    <div className="relative w-full bg-[#0a0a0f] min-h-screen overflow-x-hidden">
      <main className="relative z-10 w-full min-h-[100vh] bg-black flex flex-col shadow-[0px_40px_100px_rgba(0,0,0,0.5)] rounded-b-[2.5rem] overflow-hidden border-b border-white/10">
         {/* Navbar */}
         <nav className="w-full flex items-center justify-between px-6 py-4 md:px-12 fixed top-0 z-50 bg-black/50 backdrop-blur border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white">
                 <Wine size={20} className="text-black" />
              </div>
              <span className="font-bold text-lg tracking-wide text-white">Winery OS</span>
            </div>
            <div>
              {user ? (
                 <Link href="/dashboard" className="px-5 py-2.5 rounded-full text-sm font-semibold bg-white text-black transition hover:bg-gray-200">
                    Dashboard
                 </Link>
              ) : (
                 <div className="flex items-center gap-4">
                   <SignInButton />
                   <GetStartedButton />
                 </div>
              )}
            </div>
         </nav>

         {/* Floating Background Paths Hero */}
         <div className="-mt-16">
           <BackgroundPaths 
              title="Winery OS Intelligence"
              actionButton={
                  user ? (
                    <Link href="/dashboard">
                      <Button
                          variant="ghost"
                          className="rounded-[1.15rem] px-8 py-6 text-lg font-semibold backdrop-blur-md 
                          bg-white/95 hover:bg-white/100 dark:bg-black/95 dark:hover:bg-black/100 
                          text-black dark:text-white transition-all duration-300 
                          group-hover:-translate-y-0.5 border border-black/10 dark:border-white/10
                          hover:shadow-md dark:hover:shadow-neutral-800/50"
                      >
                          <span className="opacity-90 group-hover:opacity-100 transition-opacity">Enter Workspace</span>
                          <span className="ml-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all duration-300">→</span>
                      </Button>
                    </Link>
                  ) : (
                    <Link href="/sign-up">
                      <Button
                          variant="ghost"
                          className="rounded-[1.15rem] px-8 py-6 text-lg font-semibold backdrop-blur-md 
                          bg-white/95 hover:bg-white/100 dark:bg-black/95 dark:hover:bg-black/100 
                          text-black dark:text-white transition-all duration-300 
                          group-hover:-translate-y-0.5 border border-black/10 dark:border-white/10
                          hover:shadow-md dark:hover:shadow-neutral-800/50"
                      >
                          <span className="opacity-90 group-hover:opacity-100 transition-opacity">Discover Excellence</span>
                          <span className="ml-3 opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all duration-300">→</span>
                      </Button>
                    </Link>
                  )
              }
           />
         </div>

         {/* Hero Scroll Animation */}
         <div className="flex flex-col items-center justify-center overflow-hidden pb-[100px] pt-[20px] bg-black">
           <ContainerScroll
             titleComponent={
               <>
                 <h1 className="text-4xl md:text-5xl font-semibold mb-2 text-white">
                   Unleash the full potential of your <br />
                   <span className="text-5xl md:text-[6rem] font-bold mt-2 leading-none inline-block pb-2 tracking-tight text-white">
                     Winery Operations
                   </span>
                 </h1>
               </>
             }
           >
             <Image
               src={`https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=2940&auto=format&fit=crop`}
               alt="Classic Red Wine Glass"
               height={1080}
               width={1920}
               className="mx-auto rounded-2xl object-cover h-full object-center sm:object-left-top"
               draggable={false}
               priority
               unoptimized

             />
           </ContainerScroll>
         </div>
      </main>

      <CinematicFooter />
    </div>
  );
}
