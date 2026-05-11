"use client";

import { motion, useReducedMotion } from "framer-motion";

const particles = [
  { left: "8%", top: "18%", size: "h-2 w-2", delay: 0 },
  { left: "18%", top: "70%", size: "h-1.5 w-1.5", delay: 0.7 },
  { left: "36%", top: "28%", size: "h-2.5 w-2.5", delay: 1.4 },
  { left: "54%", top: "78%", size: "h-1.5 w-1.5", delay: 2.1 },
  { left: "72%", top: "20%", size: "h-2 w-2", delay: 2.8 },
  { left: "88%", top: "62%", size: "h-1.5 w-1.5", delay: 3.5 },
  { left: "65%", top: "15%", size: "h-3 w-3", delay: 1.2 },
  { left: "78%", top: "45%", size: "h-2 w-2", delay: 2.5 },
  { left: "82%", top: "72%", size: "h-2.5 w-2.5", delay: 3.2 },
  { left: "92%", top: "35%", size: "h-1.5 w-1.5", delay: 1.8 },
];

const petals = [
  { left: "69%", top: "17%", size: "h-5 w-10", rotate: -22, delay: 0.2 },
  { left: "82%", top: "13%", size: "h-6 w-12", rotate: -28, delay: 1.1 },
  { left: "88%", top: "48%", size: "h-5 w-11", rotate: -18, delay: 0.7 },
  { left: "72%", top: "72%", size: "h-4 w-9", rotate: 16, delay: 1.7 },
  { left: "95%", top: "38%", size: "h-4 w-9", rotate: 28, delay: 2.3 },
];

export default function LuxuryHeroEffects() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      <motion.div
        aria-hidden="true"
        className="absolute right-[8%] top-[12%] h-56 w-56 rounded-full bg-yellow-300/20 blur-3xl"
        animate={reduceMotion ? undefined : { opacity: [0.35, 0.65, 0.35], scale: [1, 1.08, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute bottom-0 left-[8%] h-28 w-80 rounded-full bg-white/70 blur-3xl"
        animate={reduceMotion ? undefined : { x: [-24, 28, -24], opacity: [0.32, 0.58, 0.32] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        aria-hidden="true"
        className="absolute right-[-8%] top-[10%] hidden h-24 w-[42rem] rounded-full bg-[linear-gradient(100deg,transparent_0%,rgba(143,82,18,0.12)_12%,rgba(255,230,150,0.58)_30%,rgba(150,84,20,0.22)_52%,rgba(255,244,190,0.42)_68%,transparent_100%)] opacity-80 blur-[0.4px] [transform-origin:center] md:block"
        style={{ rotate: "-24deg" }}
        animate={
          reduceMotion
            ? undefined
            : {
                x: [-10, 16, -10],
                y: [0, -8, 0],
                opacity: [0.56, 0.86, 0.56],
                scaleY: [0.96, 1.05, 0.96],
              }
        }
        transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        aria-hidden="true"
        className="absolute right-[30%] top-[4%] hidden h-20 w-[22rem] rounded-full bg-[linear-gradient(95deg,transparent_0%,rgba(255,243,193,0.5)_26%,rgba(143,82,18,0.18)_50%,rgba(255,238,165,0.4)_76%,transparent_100%)] opacity-60 blur-[0.5px] md:block"
        style={{ rotate: "70deg" }}
        animate={
          reduceMotion
            ? undefined
            : {
                x: [0, -12, 0],
                y: [-8, 10, -8],
                opacity: [0.38, 0.68, 0.38],
                scaleX: [0.98, 1.05, 0.98],
              }
        }
        transition={{ duration: 9.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {petals.map((petal) => (
        <motion.span
          aria-hidden="true"
          key={`${petal.left}-${petal.top}`}
          className={`absolute hidden ${petal.size} rounded-[70%_30%_70%_30%] bg-[linear-gradient(135deg,#fff1a8_0%,#d19526_48%,#8c4e0f_100%)] shadow-[0_8px_18px_rgba(122,72,17,0.22)] md:block`}
          style={{ left: petal.left, top: petal.top, rotate: `${petal.rotate}deg` }}
          animate={
            reduceMotion
              ? undefined
              : {
                  x: [0, 16, -6, 0],
                  y: [0, -18, 8, 0],
                  rotate: [petal.rotate, petal.rotate + 18, petal.rotate - 10, petal.rotate],
                  opacity: [0.6, 0.95, 0.68, 0.6],
                }
          }
          transition={{
            duration: 7.2,
            delay: petal.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {particles.map((particle) => (
        <motion.span
          aria-hidden="true"
          key={`${particle.left}-${particle.top}`}
          className={`absolute ${particle.size} rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 blur-[0.5px] shadow-lg`}
          style={{ left: particle.left, top: particle.top }}
          animate={
            reduceMotion
              ? undefined
              : {
                  y: [0, -28, 0],
                  x: [0, 12, 0],
                  opacity: [0.3, 0.7, 0.3],
                  rotate: [0, 180, 360],
                }
          }
          transition={{
            duration: 7,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
