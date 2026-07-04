class NoiseGenerator {
    constructor(octaves, freqStart, freqInc, ampFalloff, seed) {
        this.octaves = octaves;
        this.freqStart = freqStart || 1;
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

        for(let i = 0; i < this.octaves; i++) {
            let freq = this.freqStart * Math.pow(this.freqInc, i);
            total += (noise(x * freq, y * freq, z * freq) * 2 - 1) / Math.pow(this.ampFalloff, i);
        }

        return total / this.maxNoise;
    }
}