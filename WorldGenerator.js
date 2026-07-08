class WorldGenerator {
    constructor(wid, params) {
        //generation parameter defaults
        this.params = {
            noiseOctaves: 20,
            noiseFreqStart: 0.3,
            noiseFreqInc: 4,
            noiseAmpFalloff: 2,
            noiseSeed: null,
            noise2Freq: 1.5,
            noise2Amp: 0.5,
            noiseRidgeFreq: 2,
            noiseRidgeStrength: 0.8,
            noiseRidgeExp: 6,

            planetRad: 6.371e6, //Earth radius (m)
            surfaceArea: 5.100e14, //Earth surface area m^2
            waterCoverage: 0.71, //Earth water coverage (% of surface area)
            maxElevation: 8.848e3 //Height of Mount Everest (m)
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
                //properties of each cell
                let cell = this.cells[i][j] = {};
                cell.x = i;
                cell.y = j;
                cell.longLeft = cell.x / this.cols * 2 * Math.PI;
                cell.longRight = (cell.x + 1) / this.cols * 2 * Math.PI;
                cell.colatTop = cell.y / this.rows * Math.PI;
                cell.colatBottom = (cell.y + 1) / this.rows * Math.PI;
                cell.width = this.params.planetRad * (cell.longRight - cell.longLeft) * Math.sin((cell.colatTop + cell.colatBottom) / 2);
                cell.height = this.params.planetRad * (cell.colatBottom - cell.colatTop);
                cell.area = cell.width * cell.height;

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
        for(let i in this.cells) {
            for(let j in this.cells[i]) {
                func(this, this.cells[i][j]);
                if(drawFunc) drawFunc(this, this.cells[i][j]);
                yield;
            }
        }
    }

    *actOnCellsTimes(func, times, drawFunc, drawMod) {
        this.func = func;
        for(let t = 1; t <= times; t++) {
            for(let i in this.cells) {
                for(let j in this.cells[i]) {
                    func(this, this.cells[i][j]);
                    if(drawFunc && t % drawMod == 0) drawFunc(this, this.cells[i][j]);
                    yield;
                }
            }
        }
    }

    sphereNoise(world, cell) {
        //arbitrary bias to the location noise is sampled from
        //prevents repeating patturns
        const bias = 10;

        //sample noise from a 3D space, on the surface of a sphere
        let theta = (cell.x / world.cols) * 2 * Math.PI;
        let phi = (cell.y / world.rows) * Math.PI;
        let rho = 1;

        let x = rho * Math.sin(phi) * Math.cos(theta) + bias;
        let y = rho * Math.sin(phi) * Math.sin(theta) + bias;
        let z = rho * Math.cos(phi) + bias;

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
        world.details.waterLevel = world.details.noiseAvg + 0.524 * Math.sqrt(world.details.noiseVar);
    }

    elevationWater(world, cell) {
        if(cell.noise < world.details.waterLevel) {
            cell.sea = true;
            cell.elev = 0;
            world.details.waterPercent += cell.area / world.details.surfaceArea;
        } else {
            cell.sea = false;
            cell.elev = map(cell.noise, world.details.waterLevel, world.details.noiseMax, 0, world.params.maxElevation);
        }
    }

    elevationRidges(world, cell) {
        if(cell.sea) return;
        const bias = 20;

        //sample noise from a 3D space, on the surface of a sphere
        let theta = (cell.x / world.cols) * 2 * Math.PI;
        let phi = (cell.y / world.rows) * Math.PI;
        let rho = world.params.noiseRidgeFreq;

        let x = rho * Math.sin(phi) * Math.cos(theta) + bias;
        let y = rho * Math.sin(phi) * Math.sin(theta) + bias;
        let z = rho * Math.cos(phi) + bias;

        cell.elev *= map(world.params.noiseRidgeStrength, 0, 1, 1, Math.pow(1 - Math.abs(noise(x, y, z)*2-1), world.params.noiseRidgeExp));
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

    drawCellNoise(world, cell) {
        if(world.details.noiseVar > 0) {
            world.vis.fill(((cell.noise - world.details.noiseAvg) / 2 + 0.5) * 255);
        } else {
            world.vis.fill((cell.noise / 2 + 0.5) * 255);
        }

        world.vis.rect(cell.x, cell.y, 1, 1);
    }

    drawCellElev(world, cell) {
        if(cell.sea) {
            world.vis.fill(0, 0, 180);
        } else {
            const col1 = [50, 200, 50];
            const col2 = [128, 128, 128];
            const col3 = [255, 255, 255];
            const divider = world.params.maxElevation * 0.5;
            if(cell.elev < divider) {
                world.vis.fill(
                    map(cell.elev, 0, divider, col1[0], col2[0]),
                    map(cell.elev, 0, divider, col1[1], col2[1]),
                    map(cell.elev, 0, divider, col1[2], col2[2]),
                )
            } else {
                world.vis.fill(
                    map(cell.elev, divider, world.params.maxElevation, col2[0], col3[0]),
                    map(cell.elev, divider, world.params.maxElevation, col2[1], col3[1]),
                    map(cell.elev, divider, world.params.maxElevation, col2[2], col3[2]),
                )
            }
        }

        world.vis.rect(cell.x, cell.y, 1, 1);
    }

    drawCellTopo(world, cell) {
        world.vis.blendMode(MULTIPLY);

        if(cell.sea) {
            // world.vis.fill(0, 0, 180);
        } else {
            world.vis.fill(map(cell.gradY, -0.01, 0.01, 128, 255));
            world.vis.rect(cell.x, cell.y, 1, 1);
        }

        world.vis.blendMode(BLEND);
    }
}