# Divide-And-Conquer Testing

* Testing is writing small programs that match the large program for specific inputs
  * The large program is called the "test target" (the program being tested)
  * The small program is called the "test double" (the program used for testing)
  * The test itself is a program that ensures the double program matches the target
* Testing checks two things:
  * Presence of features
  * Absence of bugs
* Bugs are unexpected consequences of the features
  * Bugs arise when the implementation is different from the definition
  * [Bug types](#bug-types)
* Bugs can be found by manually comparing the actual output with the expected output for every possible input, but it would take a lot of time
* Testing methodologies solve this problem in different ways
* Divide-and-Conquer Testing (abbreviated as D&C Testing, DnC Testing) is a methodology that takes a large program and splits it into multiple "branches" (small simplified programs) for specific inputs

## General notes

* Every [generalized input](#generalized-input) can be reduced to its own [partition](#partition) via the program
* Every large program can be reduced to a small program by applying conditions on the inputs
  * Examples
    * [getRootsFromQuadraticEquationCoefficients](#getrootsfromquadraticequationcoefficients) can be reduced to [getRootFromLinearEquationCoefficients](#getrootfromlinearequationcoefficients) by applying the condition `a = 0`
    * [getGreetingFromFilename](#getgreetingfromfilename) can be reduced to [throwError](#throwerror) with a specific input "ENOENT" (Node.js-specific error code for "File not found") by applying the condition `!exists(filename)`
* The general form of a condition is [Conditional](#conditional)
* Conditions can only be generated from the program itself (see [Branches](#branches))
* Standard library functions may contain branching expressions, too
* Program must be converted into pure form before decomposition
  * Examples
    * An `fs.readFile` call must be purified to ensure that the return type includes all possible constructors  

## Listeners

### Write "Write the test"

Meta-options:

* Write extensional test (compare the outputs of target and double)
  * The comparison may be any function from two inputs to boolean: ==, ===, >, <, >=, =<, isSubset, ...
* Write intensional test (compare the code of target and double)

Options:

* Certified programming
  * Write the State type as a proof-carrying type
  * Require every transition to prove that the state is valid
  * Write existentionals for each feature
    * Existentional examples:
      * Mint: there exists a transition t such that totalSupply increases after t
* Generate branches, generate reduced programs for branches, ask the programmer if he agrees with them
* Generate branches, ask the programmer to write the reduced programs
* Ask the programmer to write the branches & the reduced programs
* Divide-and-Conquer
  * Get a list of relations from the test target

### Write the test

Main idea: generate "special cases" of state & transition arguments, then write "special transitions" for "special cases" (simplified versions of the original transition), the test the equality between results of original & simplified transition.

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
* Some [steps](#step) are "equivalent"
  * Examples
    * `def State = Nat`
    * `def init : State = zero`
    * `def inc : Transition State = succ`
    * `def step1 : Step = ⟨init, inc, ⟩`

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

* We need to generate new steps from the actual states, because most states are invalid
  * If we generate the steps separately, without a valid state as input, then we may generate an invalid state
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

`def Transition = State -> State`

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

### Generalized input

A structure that contains all inputs of the function as fields.

Notes:

* For stateful programs, the generalized input is equal to a pair of [state](#state) and a union of [transitions](#transition)

### Partition

A list of subsets whose union is the full set.

### Process

```lean4
structure Process where
 state : State
 transitions : List Transition
```

### Step

```lean4
structure Step where
  state : State
  transition : Transition
  params : TransitionParams
```

### Continuous operation

Operation that only uses induction and terminating recursion

Examples:

* add : Nat -> Nat -> Nat
* concat (T : Type) : List T -> List T -> List T

Decisions:

* Is monus a continuous operation?
  * Not really, because it breaks our intuition

### Conditional

```lean4
structure Conditional (A B C : Type) where
  transformA : A -> C
  transformB : B -> C
  compare : C -> C -> Bool
  
-- note that transformA & transformB may be more complex than just typecasts (example: transformA := length, so that we could generate lists with length > another input)
def cond2bool {A B C : Type} (c : Conditional A B C) (a : A) (b : B) := c.compare(c.transformA(a), c.transformB(b))
```

### Relation

```lean4
def Relation {A : Type} : A -> A -> Bool
```

## Examples

### getGreetingFromName

```typescript
function getGreetingFromName(name: string) {
  if (name === '') {
    throw new Error('Name cannot be empty')
  } else {
    return `Hello ${name}`
  }
}
```

### getGreetingFromFilename

```typescript
import { readFile } from 'fs/async'

async function getGreetingFromFilename(filename: string) {
  const name = await readFile(filename)  
  return getGreetingFromName(name)
}
```

### getRootsFromQuadraticEquationCoefficients

```typescript
// Equation: (a * x^2) + (b * x) + (c) = 0
// This function is naive (doesn't check that argument of Math.sqrt is nonnegative)
function getRootsFromQuadraticEquationCoefficients(a: number, b: number, c: number) {
  const d = Math.sqrt(Math.pow(b, 2) - 4 * a * c)
  const x1 = (-b + d) / (2 * a)
  const x2 = (-b - d) / (2 * a)
  return [x1, x2]
}
```

### getRootFromLinearEquationCoefficients

```typescript

// Equation: (k * x) + (n) = 0
// This function is naive (doesn't check that n is nonzero)
function getRootFromLinearEquationCoefficients(k: number, n: number) {
  return -n / k
}
```

### throwError

```typescript
// This function is a simple wrapper for demonstration purposes
function throwError(message?: string) {
  throw new Error(message)
}
```

## TODO

### Ideas

* Extract the relations from code
  * Examples
    * ERC20.transfer
      * ERC20.transfer checks that amount <= balance
      * We need to test two cases:
        * amount <= balance
        * !(amount <= balance)
      * We need to generate two states
        * amount = X, balance = X
        * amount = X + 1, balance = X
    * Division by zero
      * Division checks that denominator is not zero
      * We need to test two cases
        * denominator == 0
        * !(denominator == 0)
  * Notes
    * If the code checks for equality of two variables, extract equality
    * If the code checks for lte of two variables, extract equality
    * In general: extract every "fork" in the program path that leads to a qualitatively different result
      * Include the "forks" of built-in operations (e.g. memory allocation - check for buffer overflows)

### Finitism

The following applies to classical computers:

* Memory is finite
* Every real data type is finite: it has a finite amount of bits
* Every real data type has a nadir: its value with all bits set to zero
* Every real data type has a zenith: its value with all bits set to one
* Some abstract data types are infinite (e.g. natural numbers)
* Some abstract operations are continuous

### Branches

Branch is a program that is executed when a match expression evaluates to true.

Notes:

* Most programs have branches
  * Examples
    * [getGreetingFromName](#getgreetingfromname) has two branches:
      * name is ''
      * name is not ''
    * [getGreetingFromFilename](#getgreetingfromfilename) has three branches:
      * file does not exist
      * file is empty
      * file is not empty
    * getRootsFromQuadraticEquationCoefficients has multiple branches
* Every branch can be written as a program which is simpler than the original program
  * For some programs, there exist a pair of equal branches, but most of the time the branches are different
* Also, it is possible to generate smaller programs for specific

### Real data types

#### 8-bit unsigned integer

* Nadir: 0
* Zenith: 255

#### 32-bit floating point number defined by IEEE 754

* Nadir: 0
* Zenith: (2 − 2^−23) × 2^127 (see spec)

#### C-style string

* Nadir: '' (empty string)
* Zenith: ?
  * Length depends on available memory
  * Visual representation depends on encoding (the same string is rendered with different characters in ASCII vs UTF-8)

#### C-style array

* Nadir: [] (empty array)
* Zenith: ?
  * Length depends on available memory
  * Visual representation depends on element type

#### JavaScript object

* Nadir: {} (empty object)
* Zenith: ?

### Bug types

* Buffer overflow (the programmer didn't expect that `a + 1 === 0` where `a` is an unsigned integer with maximum value for its size)
* SQL injection (the programmer didn't expect that people would submit a `username` that contains a part of SQL query which deletes all records after being substituted in `SELECT * FROM users WHERE username = ${username}`)
