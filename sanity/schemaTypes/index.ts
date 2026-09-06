import {booking} from './booking'
import {unit} from './unit'
import {hero} from './hero'
import {location} from './location'
import {stayDefaults} from './stayDefaults'
import {siteSettings} from './siteSettings'

// Collections
const collections = [unit, booking]
// Singletons — one document each; use a structure/desk config to pin them.
const singletons = [siteSettings, hero, location, stayDefaults]

export const schemaTypes = [...collections, ...singletons]
