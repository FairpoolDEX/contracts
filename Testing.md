# Testing

## Listeners

### Write the test

Main idea: generate "special cases" of state & transition arguments, then test the equality of results from:

* Actual transition
* Simplified transition applicable only in this special case

Special cases are defined as a list of predicates over variables. For example:

* variable = constant
  * Get constants from type
    * Get min value
    * Get max value
    * Get constants from type constructor
      * Examples
        * zero
        * next another_variable
  * Get constants from code ("magic values")
* variable = variable

Filter invalid cases (e.g. `a > b -> b > a`) (or use a non-contradictory generation)

generate a list of pairs of (State, Transition), ensure it covers "interesting" cases (e.g. two variables of the same type being equal, or being less-than), compare the results of

* [Define state](#define-state)
* [Define pathfinder](#define-pathfinder)
* TODO

Notes:

* Do we need to express the liveness & fairness properties?
  * For some [processes](#process), they are obvious

### Run the test

```lean4
def run_many {State} {Error} (pathfinder : Pathfinder State) (states: List State) : List Error := match states with
  | nil => nil
  | cons state tail => concat (run_one state) (run_many tail)
  
def run_one {State} {Error} (pathfinder : Pathfinder State) (state: State) : List Error :=
  let transitions := pathfinder state
  let states := transitions.mapOver state
  states
    .filter isTerminal
    .map run_one pathfinder
    .flatten
```

Notes:

* If you don't know how to implement a function efficiently, make it a parameter
  * Examples
    * isTerminal

### Define state

return typeof [State](#state)

### Define pathfinder

return [Pathfinder](#pathfinder)

## Definitions

### SUT

Acronym for "System Under Test".

### State

A structure that represents the state of the [SUT](#sut).

```lean4
variable (Data Output Error : Type) -- IMPORTANT: all definitions below use these parameters implicitly

structure State where
  data : Data
  result : Result Output Error
```

Notes:

* Should we ensure that [mistakes](#mistake) are always [terminal](#terminal)?
  * Options
    * Yes
    * No
      * Some systems may return an error & still change their state
        * We can model such errors as Data field instead of State field
          * Do we really need this distinction between Data, Output, Error?
            * We need it to determine which states we should not explore further
              * Options
                * Option 1
                  * Allow the state to be any type
                  * Recommend to use `structure` with `data` and `result` as state type
  * Decision: No
    * Some systems may return an error & still change their state
  * If Yes
    * How to ensure that [mistakes](#mistake) are always [terminal](#terminal)?
      * Options
        * Change Transition to State -> Result Value Error
          * def Value := Pair Data Output
          * def Transition := State -> Result Value Error

### Transition

A function from State to State.

Use [TransitionBuilders](#transitionbuilder) to create parametrized transitions.

Notes:

* Output is a property of the state
* Error is a property of the state
* "Commands" in `fast-check` can be seen as Transitions

Decisions:

* How to model output (aka return value)?
  * Examples
    * An API call mutates the state & returns a value
    * An API call doesn't mutate the state & returns a value
    * An API call mutates the state & doesn't return a value
      * Model as "returns none"
  * Options
    * As a field in the transition output
    * As a field in the State
  * Result
    * As a field in the State (because it's cleaner)

### TransitionBuilder

A function that returns a Transition.

### Mistake

A [Transition](#transition) that results in an error.

```lean4
structure Mistake (t : Transition State) : Prop where
  s : State
  result_is_error : (t s).result "matches" error _
```

### Terminal

A Transition that doesn't change the state.

```lean4
structure Terminal {State} (t : Transition State) where
  s : State
  transition_does_not_change_state : t s = s
```

Notes:

* [Mistakes](#mistake) are always terminal
* Some Transitions may be terminal in one state & non-terminal in another
  * Example 1
    * Definitions
      * def Stack := List String
      * def push (str : String) : Transition Stack := fun state => cons str state
      * def pull : Transition Stack := fun state => match state with
        * | nil => state
        * | cons _ tail => tail
    * `(state : Stack) -> state = [] -> Terminal pull`
    * `(state : Stack) -> state = ["any"] -> Not (Terminal pull)`
* Some Transitions are always terminal
  * Example 1
    * Definitions
      * def Stack := List String
      * def push (str : String) : Transition Stack := fun state => cons str state
      * def pull : Transition Stack := fun state => match state with
        * | nil => state
        * | cons _ tail => tail
    * `(state : Stack) -> state = [] -> Terminal pull`
    * `(state : Stack) -> state = ["any"] -> Not (Terminal pull)`

### Pathfinder

`def Pathfinder := Execution -> List Transition`

### Result

```lean4
inductive Result (Value) (Error) :=
  | value : Value -> Result
  | error : Error -> Result
```

### Trajectory

`def Trajectory := List Transition`

### Execution

```lean4
structure Execution where
  state : State
  trajectory : Trajectory 
```

Notes:

* Execution is needed for caching
  * It's expensive to derive the current State from Trajectory and initial State

### Process

```lean4
def Process = Pair State Transitions
```
