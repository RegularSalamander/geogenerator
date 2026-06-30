class NoiseGenerator {
    constructor(octaves, freqInc, ampFalloff, seed) {
        this.octaves = octaves;
        this.freqInc = freqInc || 2;
        this.ampFalloff = ampFalloff || 2;
        if(seed) noiseSeed(seed);

        this.maxNoise = 0;
        for(let i = 0; i < this.octaves; i++) {
            this.maxNoise += 1/Math.pow(ampFalloff, i);
        }
    }

    getNoise(x, y, z) {
        let total = 0;
        let amp = 1;
        let freq = 1;

        for(let i = 0; i < this.octaves; i++) {
            total += noise(x * freq, y * freq, z * freq) * amp;

            freq *= this.freqInc;
            amp /= this.ampFalloff;
        }

        return total / this.maxNoise;
    }
}