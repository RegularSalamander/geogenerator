class WorldGenerator {
    constructor(wid, params) {
        //generation parameter defaults
        this.params = {
            noiseOctaves: 8,
            noiseFreqStart: 0.5,
            noiseFreqInc: 2.5,
            noiseAmpFalloff: 1.5,
            noiseSeed: null,

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
            noiseMax: 0,
            noiseMin: 0,
            noiseAvg: 0,
            noiseVar: 0,
            waterPercent: 0,
            surfaceArea: 0
        }

        //grid of cells
        this.cols = Math.floor(wid/2)*2;
        this.rows = this.cols/2;
        this.cells = [];
        for(let i = 0; i < this.cols; i++) {
            this.cells[i] = [];
            for (let j = 0; j < this.rows; j++) {
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
    }

    getCell(x, y) {
        //handle spherical shaped world
        while(x < 0) x += this.cols;
        while(x > this.cols) x -= this.cols;
        while(y < 0) y += this.rows;
        while(y > this.rows) y -= this.rows;

        return this.cells[x][y];
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

    sphereNoise(world, cell) {
        //arbitrary bias to the location noise is sampled from
        //prevents repeating patturns
        const bias = 10;

        //sample noise from a 3D space, on the surface of a sphere
        const theta = (cell.x / world.cols) * 2*Math.PI;
        const phi = (cell.y / world.rows) * Math.PI;
        const rho = 1;
        
        const x = rho * Math.sin(phi) * Math.cos(theta) + bias;
        const y = rho * Math.sin(phi) * Math.sin(theta) + bias;
        const z = rho * Math.cos(phi) + bias;

        cell.noise = world.noiseGen.getNoise(x, y, z);
        if(!world.details.noiseMin || cell.noise < world.details.noiseMin) world.details.noiseMin = cell.noise;
        if(!world.details.noiseMax || cell.noise > world.details.noiseMax) world.details.noiseMax = cell.noise;
        world.details.noiseAvg += cell.noise * cell.area / world.details.surfaceArea;
    }

    calcNoiseVariance(world, cell) {
        world.details.noiseVar += Math.pow(cell.noise - world.details.noiseAvg, 2) * cell.area / world.details.surfaceArea;
    }

    elevationWater(world, cell) {
        const waterLevel = world.details.noiseAvg + 0.524 * Math.sqrt(world.details.noiseVar);
        // const mid = map(0.15, 0, 1, world.details.noiseAvg, world.details.noiseMax);
        if(cell.noise < waterLevel) {
            cell.sea = true;
            cell.elev = null;
            world.details.waterPercent += cell.area / world.details.surfaceArea;
        } else {
            cell.sea = false;
            cell.elev = map(cell.noise, waterLevel, world.details.noiseMax, 0, 1);
        }
    }

    testDrawCell(world, cell) {
        if(cell.elev) {
            const col1 = [50, 200, 50];
            const col2 = [128, 128, 128];
            const col3 = [255, 255, 255];
            const divider = 0.5;
            if(cell.elev < divider) {
                world.vis.fill(
                    map(cell.elev, 0, divider, col1[0], col2[0]),
                    map(cell.elev, 0, divider, col1[1], col2[1]),
                    map(cell.elev, 0, divider, col1[2], col2[2]),
                )
            } else {
                world.vis.fill(
                    map(cell.elev, divider, 1, col2[0], col3[0]),
                    map(cell.elev, divider, 1, col2[1], col3[1]),
                    map(cell.elev, divider, 1, col2[2], col3[2]),
                )
            }
        } else if(cell.sea) {
            world.vis.fill(0, 0, 180);
        } else if(cell.noise) {
            world.vis.fill((cell.noise/2+0.5) * 255);
        }

        world.vis.noStroke();
        world.vis.rect(cell.x, cell.y, 1, 1);
    }
}