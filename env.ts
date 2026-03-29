/*
|--------------------------------------------------------------------------
| Importing Named Imports
|--------------------------------------------------------------------------
*/

import { defineConfig as defineAppConfig } from '@adonisjs/core/app'
import { defineConfig as defineDatabaseConfig } from '@adonisjs/lucid/database'
import { defineConfig as defineCorsConfig } from '@adonisjs/cors'
import { defineConfig as defineHashConfig } from '@adonisjs/core/hash'

/*
|--------------------------------------------------------------------------
| Validating Environment Variables
|--------------------------------------------------------------------------
|
| The "env.ts" file is used to validate environment variables and ensure
| they are of the correct type. Uncomment the validate call below and add
| the validation schema to the "env.ts" file.
|
*/

// import { string } from '@adonisjs/core/services/env'

/*
|--------------------------------------------------------------------------
| Exporting Validations
|--------------------------------------------------------------------------
*/

export { defineAppConfig, defineDatabaseConfig, defineCorsConfig, defineHashConfig }
