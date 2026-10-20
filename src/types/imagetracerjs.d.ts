/** Narrow declarations for the ImageTracer.js 1.2.6 APIs VectorMint actually uses. */
declare module 'imagetracerjs' {
  export interface TracerColor { r: number; g: number; b: number; a: number }
  export interface TracerSegment {
    type: 'L' | 'Q'
    x1: number; y1: number; x2: number; y2: number
    x3?: number; y3?: number
  }
  export interface TracerPath {
    segments: TracerSegment[]
    boundingbox: number[]
    holechildren: number[]
    isholepath: boolean
  }
  export interface TraceData {
    layers: TracerPath[][]
    palette: TracerColor[]
    width: number
    height: number
  }
  export interface TracerOptions {
    pal?: TracerColor[]
    numberofcolors?: number
    colorquantcycles?: number
    ltres?: number
    qtres?: number
    pathomit?: number
    rightangleenhance?: boolean
    layering?: 0 | 1
    blurradius?: number
  }
  export interface ImageDataLike { width: number; height: number; data: Uint8ClampedArray }
  interface ImageTracerApi {
    imagedataToTracedata(imgd: ImageDataLike, options?: TracerOptions): TraceData
  }
  const ImageTracer: ImageTracerApi
  export default ImageTracer
}
