class WorldGenerator {
    constructor(wid, params) {
        //generation parameter defaults
        this.params = {
            planetRad: 6.37e6, //Earth radius (m)

            noiseOctaves: 20,
            noiseFreqStart: 0.5,
            noiseFreqInc: 3,
            noiseAmpFalloff: 2,
            noiseSeed: null,
            noise2Freq: 1.5,
            noise2Amp: 0.5,
            
            waterCoverage: 0.71, //Earth water coverage (% of surface area)
            maxElevation: 8.85e3, //Height of Mount Everest (m)
            oceanDepth: 4.00e3,
            waterCurveA: 1,
            waterCurveB: -6,
            noiseRidgeFreq: 2,
            noiseRidgeStrength: 0.8,
            noiseRidgeExp: 6,

            erodeDist: 0.01, //number of steps sediment/erosion is allowed to take as a percent of the worl'd width
            erodeGrad: 0.001, //gradient that removes maximum sediment
            erodeMult: 100,
            erodeMin: -20,
            erodeMax: 20,

            staticPrecip: 1, //meters of rainfall per year (worldwide)
            hydroDist: 0.1, //number of steps water is allowed to take as a percentage of the world's width
            depressionInc: 1, //meters added to a filled lake to avoid level directionless surfaces
            hydroStep: 100, //years of precipitation/evaporation simulated in a step
        }
        //manual parameters
        for(let i in params) {
            this.params[i] = params[i];
        }

        //values that will be procedurally generated
        this.details = {
            noiseMax: -Infinity,
            noiseMin: Infinity,
            noiseAvg: 0,
            noiseVar: 0,
            waterPercent: 0,
            surfaceArea: 0,
            waterLevel: 0,
            gradMax: -Infinity
        }

        //grid of cells
        this.cols = Math.floor(wid / 2) * 2;
        this.rows = this.cols / 2;
        this.cells = [];
        for(let i = 0; i < this.cols; i++) {
            this.cells[i] = [];
            for(let j = 0; j < this.rows; j++) {
                //immutable properties of each cell
                let cell = this.cells[i][j] = {};
                cell.x = i;
                cell.y = j;
                cell.longLeft = cell.x / this.cols * 2 * Math.PI;
                cell.longRight = (cell.x + 1) / this.cols * 2 * Math.PI;
                cell.long = (cell.longLeft + cell.longRight) / 2;
                cell.colatTop = cell.y / this.rows * Math.PI;
                cell.colatBottom = (cell.y + 1) / this.rows * Math.PI;
                cell.colat = (cell.colatTop + cell.colatBottom) / 2;
                cell.width = this.params.planetRad * (cell.longRight - cell.longLeft) * Math.sin((cell.colatTop + cell.colatBottom) / 2);
                cell.height = this.params.planetRad * (cell.colatBottom - cell.colatTop);
                cell.area = cell.width * cell.height;
                cell.cartX = Math.sin(cell.colat) * Math.cos(cell.long);
                cell.cartY = Math.sin(cell.colat) * Math.sin(cell.long);
                cell.cartZ = Math.cos(cell.colat);

                //properties that will be set later
                cell.noise = 0;
                cell.sea = false;
                cell.elev = 0;
                cell.waterLevel = 0;
                cell.flow = 0;
                cell.flowDisp = 0;

                if(i == 0) {
                    this.details.surfaceArea += cell.area * this.cols;
                }
            }
        }

        this.noiseGen = new NoiseGenerator(
            this.params.noiseOctaves,
            this.params.noiseFreqStart,
            this.params.noiseFreqInc,
            this.params.noiseAmpFalloff,
            this.params.noiseSeed
        );

        this.vis = createGraphics(this.cols, this.rows);
        this.vis.background(0);
        this.vis.noStroke();
    }

    getCell(x, y) {
        //handle spherical shaped world
        if(y < 0) {
            x += this.cols / 2;
            y = -1 - y;
        } else if(y >= this.rows) {
            x += this.cols / 2;
            y = this.rows * 2 - y - 1;
        }
        if(x < 0) x += this.cols;
        if(x >= this.cols) x -= this.cols;

        return this.cells[x][y];
    }

    *actOnce(func) {
        func(this);
    }

    *actOnCells(func, drawFunc) {
        this.func = func;
        let progress = 0;
        for(let i in this.cells) {
            for(let j in this.cells[i]) {
                func(this, this.cells[i][j]);
                if(drawFunc) drawFunc(this, this.cells[i][j]);
                progress += 1 / (this.rows * this.cols);
                yield progress;
            }
        }
    }

    *actOnCellsTimes(funclist, times, drawFunc, drawMod) {
        let progress = 0;
        for(let t = 1; t <= times; t++) {
            for(let func of funclist) {
                this.func = func;
                progress = 0;
                for(let i in this.cells) {
                    for(let j in this.cells[i]) {
                        func(this, this.cells[i][j]);
                        progress += 1 / (this.rows * this.cols);
                        yield progress;
                    }
                }
            }
            if(drawFunc && t % drawMod == 0) {
                progress = 0;
                for(let i in this.cells) {
                    for(let j in this.cells[i]) {
                        drawFunc(this, this.cells[i][j]);
                        progress += 1 / (this.rows * this.cols);
                        yield progress;
                    }
                }
            }
        }
    }

    sphereNoise(world, cell) {
        //arbitrary bias to the location noise is sampled from
        //prevents repeating patturns
        const bias = 10;

        let x = cell.cartX + bias;
        let y = cell.cartY + bias;
        let z = cell.cartZ + bias;

        x += world.params.noise2Amp * noise(world.params.noise2Freq * x, world.params.noise2Freq * y, 10);
        y += world.params.noise2Amp * noise(world.params.noise2Freq * y, 10, world.params.noise2Freq * x);
        z += world.params.noise2Amp * noise(10, world.params.noise2Freq * x, world.params.noise2Freq * y);

        cell.noise = world.noiseGen.getNoise(x, y, z);

        if(cell.noise < world.details.noiseMin) world.details.noiseMin = cell.noise;
        if(cell.noise > world.details.noiseMax) world.details.noiseMax = cell.noise;
        world.details.noiseAvg += cell.noise * cell.area / world.details.surfaceArea;
    }

    sumNoiseVariance(world, cell) {
        world.details.noiseVar += Math.pow(cell.noise - world.details.noiseAvg, 2) * cell.area / world.details.surfaceArea;
    }

    calcWaterLevel(world) {
        //TODO calculate water level with probit function
        world.details.waterLevel = world.details.noiseAvg + 0.524 * Math.sqrt(world.details.noiseVar);
    }

    elevationWater(world, cell) {
        if(cell.noise < world.details.waterLevel) {
            cell.elev = map(cell.noise, world.details.waterLevel, world.details.noiseMin, 0, -world.params.oceanDepth);;
            cell.waterLevel = -cell.elev;
            world.details.waterPercent += cell.area / world.details.surfaceArea;
        } else {
            cell.sea = false;
            cell.elev = map(cell.noise, world.details.waterLevel, world.details.noiseMax, 0, world.params.maxElevation);
        }
    }

    elevationRidges(world, cell) {
        if(cell.elev > 0) {
            const bias = 20;

            let x = cell.cartX * world.params.noiseRidgeFreq + bias;
            let y = cell.cartY * world.params.noiseRidgeFreq + bias;
            let z = cell.cartZ * world.params.noiseRidgeFreq + bias;

            cell.elev *= map(world.params.noiseRidgeStrength, 0, 1, 1, Math.pow(1 - Math.abs(noise(x, y, z)*2-1), world.params.noiseRidgeExp));
        } else {
            const curve = (t, a, b) => (Math.pow(t + a, b) - Math.pow(a, b)) / (Math.pow(1 + a, b) - Math.pow(a, b))
            cell.elev = curve(map(cell.elev, 0, -world.params.oceanDepth, 0, 1), world.params.waterCurveA, world.params.waterCurveB) * -world.params.oceanDepth;
            cell.waterLevel = -cell.elev;
        }
    }

    calcGradient(world, cell) {
        cell.gradX = 
            (world.getCell(cell.x + 1, cell.y).elev - world.getCell(cell.x - 1, cell.y).elev) /
            (cell.width + world.getCell(cell.x + 1, cell.y).width/2 + world.getCell(cell.x - 1, cell.y).width/2);
        cell.gradY = 
            (world.getCell(cell.x, cell.y + 1).elev - world.getCell(cell.x, cell.y - 1).elev) /
            (cell.height + world.getCell(cell.x, cell.y + 1).height/2 + world.getCell(cell.x, cell.y - 1).height/2);

        if(Math.abs(cell.gradX) > world.details.gradMax) world.details.gradMax = Math.abs(cell.gradX);
    }

    traceHydro(world, cell) {
        let runoff = world.params.staticPrecip * cell.area * world.params.hydroStep;
        let addFlow = true;

        for(let step = 0; step < world.cols * world.params.hydroDist; step++) {
            let dir = world.d8Dir(world, cell);

            if(dir[0] == 0 && dir[1] == 0) {
                let raise = Math.min(world.minUphill(world, cell) + world.params.depressionInc, runoff / cell.area);
                cell.waterLevel += raise;
                runoff -= raise * cell.area;
                addFlow = false;
                if(runoff <= 0) return;
            } else {
                cell = world.getCell(cell.x + dir[0], cell.y + dir[1]);
                if(addFlow) {
                    cell.flow += runoff / world.params.hydroStep;
                }
            }
        }

        cell.waterLevel += runoff / cell.area;
    }

    traceSediment(world, cell) {
        if(cell.waterLevel > 0) return;
        let sediment = 0;

        for(let step = 0; step < world.cols * world.params.erodeDist; step++) {
            let dir = world.d8Dir(world, cell);

            let elevChange = constrain(map(dir[2], 0, world.params.erodeGrad, 1, -1) * world.params.erodeMult, world.params.erodeMin, world.params.erodeMax);
            elevChange = Math.min(elevChange, sediment / cell.area);
            if(elevChange > 0 || cell.waterLevel < 1) {
                sediment -= elevChange * cell.area;
                cell.elev += elevChange;
            }

            cell = world.getCell(cell.x + dir[0], cell.y + dir[1]);
        }

        cell.elev += sediment / cell.area;
    }

    finalizeHydro(world, cell) {
        cell.flowDisp = cell.flow;
        cell.flow = 0;

        cell.waterLevel = Math.max(cell.waterLevel - 1.42 * world.params.hydroStep, 0);
    }

    d8Dir(world, cell) {
        let steepest = 0;
        let dir = [0, 0, 0];

        for(let x = -1; x <= 1; x++) {
            for(let y = -1; y <= 1; y++) {
                if(x == 0 && y == 0) continue;
                let other = world.getCell(cell.x + x, cell.y + y);
                // if(other.sea) return [x, y];
                let slope = cell.elev + cell.waterLevel - (other.elev + other.waterLevel);
                if(slope > steepest) {
                    steepest = slope;
                    dir = [x, y, steepest];

                    dir[2] /= dist(cell.cartX, cell.cartY, cell.cartZ, other.cartX, other.cartY, other.cartZ) * world.params.planetRad;
                }
            }
        }

        return dir;
    }

    minUphill(world, cell) {
        let min = Infinity;

        for(let x = -1; x <= 1; x++) {
            for(let y = -1; y <= 1; y++) {
                if(x == 0 && y == 0) continue;
                let other = world.getCell(cell.x + x, cell.y + y);
                let slope = (other.elev + other.waterLevel) - (cell.elev + cell.waterLevel);
                if(slope < min) {
                    min = slope;
                }
            }
        }

        return Math.max(0, min);
    }

    drawCellNoise(world, cell) {
        if(world.details.noiseVar > 0) {
            world.vis.fill(((cell.noise - world.details.noiseAvg) / 2 + 0.5) * 255);
        } else {
            world.vis.fill((cell.noise / 2 + 0.5) * 255);
        }

        world.vis.rect(cell.x, cell.y, 1, 1);
    }

    drawCellElev(world, cell) {
        if(cell.waterLevel < 1) {
            world.vis.fill(colorRamp(
                cell.elev / world.params.maxElevation,
                [
                    [172,208,165],
                    [148,191,139],
                    [168,198,143],
                    [189,204,150],
                    [209,215,171],
                    [225,228,181],
                    [239,235,192],
                    [232,225,182],
                    [222,214,163],
                    [211,202,157],
                    [202,185,130],
                    [195,167,107],
                    [185,152,90],
                    [170,135,83],
                    [172,154,124],
                    [186,174,154],
                    [202,195,184],
                    [224,222,216],
                    [245,244,242]
                ]
            ));

            world.vis.rect(cell.x, cell.y, 1, 1);

            if(cell.flowDisp > 8.93e9 * 10) {
                world.vis.fill(9, 120, 171);
                world.vis.rect(cell.x, cell.y, 1, 1);
            }
        } else {
            world.vis.fill(colorRamp(
                map(cell.waterLevel, 0, world.params.oceanDepth, 0, 1),
                [
                    [216,242,254],
                    [198,236,255],
                    [185,227,255],
                    [172,219,251],
                    [161,210,247],
                    [150,201,240],
                    [141,193,234],
                    [132,185,227],
                    [121,178,222],
                    [113,171,216]
                ]
            ));
            world.vis.rect(cell.x, cell.y, 1, 1);
        }
    }

    drawCellEmboss(world, cell) {
        world.drawCellElev(world, cell);

        world.vis.blendMode(MULTIPLY);

        if(!cell.sea) {
            world.vis.fill(map(cell.gradY, -0.01, 0.01, 128, 255));
            world.vis.rect(cell.x, cell.y, 1, 1);
        }

        world.vis.blendMode(BLEND);
    }
}

function colorRamp(t, colList) {
    t = constrain(t, 0, 0.999);
    let col1 = colList[Math.floor(t * (colList.length - 1))];
    let col2 = colList[Math.floor(t * (colList.length - 1)) + 1];
    let tween = (t * (colList.length - 1)) % 1;
    return [
        map(tween, 0, 1, col1[0], col2[0]),
        map(tween, 0, 1, col1[1], col2[1]),
        map(tween, 0, 1, col1[2], col2[2]),
    ]
}