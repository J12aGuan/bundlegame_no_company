# Configuring the Game

You will need the following data inside your `config.json` file:

- `name`: string. Name of the configuration (e.g., "Phase 1 Lab Configuration")

- `timeLimit`: integer. How long the game should run in seconds

- `thinkTime`: integer. How many seconds the user gets to think before being able to select orders (timer is paused during this time)

- `gridSize`: integer. Dimensions of the game grid.  
  - For example, `3` means a 3x3 grid.
  - Maximum value is 9

- `tips`: true/false. Whether tips are active during gameplay (i.e., prices change dynamically).  
  - Requires the `store` config to contain:
    - `tip`: An array of percentages to increase the price (e.g., `[0.1, 0.2, 0.15]`)
    - `tipinterval`: The interval (in seconds) between tip changes

- `waiting`: true/false. Whether prices fluctuate while players are selecting orders (before the game starts).  
  - Requires the `store` config to contain:
    - `waiting`: An array of percentages
    - `waitinginterval`: Time interval for changes in price during the wait period

- `refresh`: true/false. Whether orders can disappear (get taken) and then reappear as a new order.  
  - Requires:
    - `demand` in the order config: Probability (per second) that an order disappears
    - `refresh` in the store config: Time (in seconds) before a disappeared order is refreshed

- `expire`: true/false. Whether unselected order(s) can appear after a game round. They stop showing (expire) after x amount of rounds. If false, this is essentially the same as x = 1.

- `conditions`:
  - An array of condition objects that define setups
  - Each object needs `name`, `order_file`, and `store_file`
  - Each condition will use a different `order_file` and `store_file` combination when assigned during game start
  - If you are not testing conditions, this should be length 1
  - The conditions will always alternate between users

- `auth`: true if it requires login. (should always be true unless tutorial)

## Example

```json
{
    "name": "Phase 1 Lab Configuration",
    "timeLimit": 1200,
    "thinkTime": 10,
    "gridSize": 3,
    "tips": false,
    "waiting": false,
    "refresh": false,
    "expire": false,
    "conditions": [
        {
            "name": "Shorter cell distances",
            "order_file": "order.json",
            "store_file": "stores1.json"
        },
        {
            "name": "Longer cell distances",
            "order_file": "order.json",
            "store_file": "stores2.json"
        }
    ]
}

```

For data analysis, the first condition is denoted configuration "0" and the second condition is denoted configuration "2"
