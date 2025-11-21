let default_job = {}
let order_list = []

let id = 0;
let orderid = 0;

function gaussianRandom(mean, stdDev) {
    // Using the Box-Muller transform to generate a Gaussian-distributed random number
    let u1 = Math.random();
    let u2 = Math.random();
    let z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    
    // Scale and shift to match the desired mean and standard deviation
    let randomFloat = z0 * stdDev + mean;
    
    // Round to the nearest integer
    let randomInt = Math.round(randomFloat);
    
    return randomInt;
}

export function switchJob(orders, stores) {
    order_list = orders
    default_job = stores
}

// TODO add way to pull from different JSON here
export function queueNFixedOrders(n) {
    console.log("queuing " + n + " orders")
    const next_orders = []
    for (let i = 0; i < n; i++) {
        next_orders.push(order_list[orderid])
        orderid += 1;
    }
    return next_orders
}

/* Returns the configuration for a store */
export function storeConfig(store) {
    let r = ""
    default_job["stores"].forEach((e) => {
        if (e["store"] === store) {
            r = e;
        }
    })
    return r;
}

export function getDistances(location) {
    return default_job["distances"][location]
}