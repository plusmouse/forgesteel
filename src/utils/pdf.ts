import { PDFDocument, PDFForm, PDFField, PDFTextField, PDFName, PDFFont, StandardFontEmbedder, PDFDict, PDFRef, PDFString } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { ConditionType, ConditionEndType } from '../enums/condition-type';
import { FeatureType } from '../enums/feature-type';
import { FeatureField } from '../enums/feature-field';
import { AbilityUsage } from '../enums/ability-usage';
import localforage from 'localforage';

const fileInput = document.createElement('input');
fileInput.type = 'file';
const downloader = document.createElement('a');

export class PDFExport {
  static startExport = async (hero: unknown) => {
    const pdfAsBytes = await fetch('/forgesteel/assets/character-sheet-backer-packet-2-modified.pdf').then(res => res.arrayBuffer())
    const pdfDoc = await PDFDocument.load(pdfAsBytes)

    const HeroLogic = (await import('../logic/hero-logic')).HeroLogic
    const FeatureLogic = (await import('../logic/feature-logic')).FeatureLogic
    const AbilityLogic = (await import('../logic/ability-logic')).AbilityLogic
    const Sourcebook = (await import('../models/sourcebook')).Sourcebook
    const SourcebookData = (await import('../data/sourcebook-data')).SourcebookData

    const autoResizingFields = []
    const markMultiline = []
    const sizeData = HeroLogic.getSize(hero)
    const texts = {
      'CharacterName': hero.name,
      'AncestryTop': hero.ancestry && hero.ancestry.name,
      'CareerTop': hero.career && hero.career.name,
      'ClassTop': hero.class && hero.class.name,
      'SubclassTop': hero.class && hero.class.subclassName + ': ' + hero.class.subclasses.filter(s => s.selected)[0].name,
      'Level': hero.class && hero.class.level,
      'Wealth': hero.state.wealth,
      'Renown': hero.state.renown,
      'XP': hero.state.xp,
      'Speed': HeroLogic.getSpeed(hero),
      'Stability': HeroLogic.getStability(hero),
      'Size': sizeData.value + sizeData.mod,
      'CurrentStamina': HeroLogic.getStamina(hero) - hero.state.staminaDamage,
      'MaxStamina': HeroLogic.getStamina(hero),
      'WindedValue': Math.floor(HeroLogic.getStamina(hero) / 2),
      'DeadValue': -Math.floor(HeroLogic.getStamina(hero) / 2),
      'RecoveryValue': HeroLogic.getRecoveryValue(hero),
      'MaxRecoveries': HeroLogic.getRecoveries(hero),
      'Recoveries': HeroLogic.getRecoveries(hero) - hero.state.recoveriesUsed,
      'HeroicResourceName': hero.class.heroicResource,
      'HeroicResource': hero.state.heroicResource,
      'Surges': hero.state.surges,
    }
    const toggles = {}

    const ignoredFeatures = {}

    {
      for(let i = 0; i < hero.state.victories && i < 15; ++i) {
        toggles['Victories' + (i + 1)] = true
      }

      // might/agility/reason/intuition/presence
      for(const details of hero.class.characteristics) {
        texts['SurgeDamage'] = Math.max(texts['SurgeDamage'] || 0, details.value)
        texts[details.characteristic] = details.value
      }
    }

    const features = HeroLogic.getFeatures(hero)
    {
      const kits = HeroLogic.getKits(hero)
      const modifiers = [
        kits,
        features.filter(f => f.name.match('Enchantment of')),
        features.filter(f => f.name.match('Prayer of')),
        features.filter(f => f.name.match(' Augmentation')),
        features.filter(f => f.name.match('Ward of'))
      ]
      texts['ModifierName'] = modifiers.filter(f => f.length > 0).map(n => n[0].name).join(', ')
      autoResizingFields.push('ModifierName')
      const modifierFields = [
        'ModifierKit',
        'ModifierEnchantment',
        'ModifierPrayer',
        'ModifierAugmentation',
        'ModifierWard',
      ]
      let fullDescription = ''
      let [speed, area, stability, stamina] = [0, 0, 0, 0]

      for(let i = 0; i < modifiers.length; ++i) {
        if(modifiers[i].length > 0) {
          toggles[modifierFields[i]] = true
          for(let feature of modifiers[i]) {
            if(feature.type == FeatureType.Text) {
              ignoredFeatures[feature.id] = true
              if(fullDescription != '') {
                fullDescription = fullDescription + '\n\n'
              }
              fullDescription = fullDescription + '==' + feature.name + '==' + '\n' + feature.description
            } else if(feature.type == FeatureType.Multiple) {
              ignoredFeatures[feature.id] = true
              feature.data.features.map(data => data.data).filter(data => data.field == FeatureField.Speed).forEach(data => speed = speed + data.value)
              feature.data.features.map(data => data.data).filter(data => data.field == FeatureField.Disengage).forEach(data => area = area + data.value)
              feature.data.features.map(data => data.data).filter(data => data.field == FeatureField.Stability).forEach(data => stability = stability + data.value)
              feature.data.features.map(data => data.data).filter(data => data.field == FeatureField.Stamina).forEach(data => stamina = stamina + data.value)
            }
          }
        }
      }
      texts['ModifierBenefits'] = fullDescription
      autoResizingFields.push('ModifierBenefits')

      if(kits.length > 0) {
        texts['ModifierWeapon'] = kits[0].weapon.join('/')
        texts['ModifierArmor'] = kits[0].armor.join('/')
        speed = speed + kits[0].speed
        stability = stability + kits[0].stability
        stamina = stamina + kits[0].stamina
        area = area + kits[0].disengage
        if(kits[0].meleeDistance !== null) {
          texts['ModifierMeleeRange'] = '+' + kits[0].meleeDistance
        }
        if(kits[0].meleeDamage !== null) {
          texts['ModifierMeleeTier1'] = '+' + kits[0].meleeDamage.tier1
          texts['ModifierMeleeTier2'] = '+' + kits[0].meleeDamage.tier2
          texts['ModifierMeleeTier3'] = '+' + kits[0].meleeDamage.tier3
        }
        if(kits[0].rangedDistance !== null) {
          texts['ModifierRangedRange'] = '+' + kits[0].rangedDistance
        }
        if(kits[0].rangedDamage !== null) {
          texts['ModifierRangedTier1'] = '+' + kits[0].rangedDamage.tier1
          texts['ModifierRangedTier2'] = '+' + kits[0].rangedDamage.tier2
          texts['ModifierRangedTier3'] = '+' + kits[0].rangedDamage.tier3
        }
      }
      if(texts['ModifierArmor'] == '' || texts['ModifierArmor'] == undefined) {
        texts['ModifierArmor'] = 'None'
      }
      if(speed > 0) {
        texts['ModifierSpeed'] = '+' + speed
      }
      if(area > 0) {
        texts['ModifierAreaRange'] = '+' + area
      }
      if(stability > 0) {
        texts['ModifierStability'] = '+' + stability
      }
      if(stamina > 0) {
        texts['ModifierStamina'] = '+' + stamina
      }
    }

    let ConvertFeatures = (features) => {
      features = features.filter(f => !ignoredFeatures[f.id])
      features.forEach(f => ignoredFeatures[f.id] = true)
      let all = ''
      for(const feature of features) {
        if(all != '') {
          all = all + '\n\n'
        }
        let text = '==' + feature.name + '==' + '\n\n' + feature.description
        // substitution is to convert any tables into text that presents
        // better in the PDF form
        text = text.replace(/(\|\:\-+)+\|\n/g, '').replace(/\|\s+(.+?)\s+\| (.+?)\s+\|/g, '$1 | $2')
        // substitutions are for cleaning up lists to look better in the form
        text = text.replace(/\* \*\*(.*?)\*\*/g, '[[$1]]')
        all = all + text
      }
      return all
    }
    {
      // Roughly split the features between the boxes, with a bias for the
      // first box, no abilities, only description-only features
      const classFeatures = FeatureLogic.getFeaturesFromClass(hero.class, hero)
      const all = ConvertFeatures(classFeatures.filter(f => f.type == FeatureType.Text))
      const lines = all.split(/\n+/)
      let splitPoint = 0
      let runningTotal = 0
      for(const l of lines) {
        runningTotal = runningTotal + l.length
        if(runningTotal < all.length/2) {
          splitPoint = splitPoint + 1
        } else {
          break
        }
      }
      // Ensure headers remain on the same line
      if(lines[splitPoint - 1].match(/^==/)) {
        splitPoint = splitPoint - 1
      }
      texts['ClassFeatures1'] = lines.slice(0, splitPoint).join('\n\n').replace(/\n\n\[\[/g, '\n[[')
      autoResizingFields.push('ClassFeatures1')
      texts['ClassFeatures2'] = lines.slice(splitPoint).join('\n\n').replace(/\n\n\[\[/g, '\n[[')
      if(texts['ClassFeatures2'] != '') {
        autoResizingFields.push('ClassFeatures2')
      }
    }

    {
      const ancestryTextFeatures = FeatureLogic.getFeaturesFromAncestry(hero.ancestry, hero)
      texts['AncestryTraits'] = ConvertFeatures(ancestryTextFeatures.filter(f => f.type == FeatureType.Text || f.type == FeatureType.DamageModifier))
    }

    {
      for(const c of hero.state.conditions) {
        if(c.ends == ConditionEndType.EndOfTurn) {
          toggles[c.type + "EoT"] = true
        } else if(c.end == ConditionEndType.SaveEnds) {
          toggles[c.type + "Save"] = true
        }
      }
    }

    {
      const homebrew = (await localforage.getItem<Sourcebook[]>('forgesteel-homebrew-settings')) as Sourcebook[]
      const books = [SourcebookData.core, SourcebookData.orden]
      if(homebrew)
        books.push(...homebrew)
      const skills = HeroLogic.getSkills(hero, books)
      console.log(skills)
      skills.map(s => s.name.replace(" ", "")).forEach(s => toggles["Skill" + s] = true)
    }

    {
      const SetTiers = (ability, prefix) => {
        ignoredFeatures[ability.id] = true
        if(ability.powerRoll) {
          texts[prefix + "Tier1"] = AbilityLogic.getTierEffect(ability.powerRoll.tier1, 1, ability, hero)
          texts[prefix + "Tier2"] = AbilityLogic.getTierEffect(ability.powerRoll.tier2, 2, ability, hero)
          texts[prefix + "Tier3"] = AbilityLogic.getTierEffect(ability.powerRoll.tier3, 3, ability, hero)
          texts[prefix + "PowerRoll"] = Math.max(...ability.powerRoll.characteristic.map(c => hero.class.characteristics.find(d => d.characteristic == c).value))
        }
        texts[prefix + "Distance"] = AbilityLogic.getDistance(ability.distance[0], hero, ability)

      }
      const CleanMelee = (prefix) => {
        texts[prefix + "Tier1"] = texts[prefix + "Tier1"].replace(' damage', '')
        texts[prefix + "Tier2"] = texts[prefix + "Tier2"].replace(' damage', '')
        texts[prefix + "Tier3"] = texts[prefix + "Tier3"].replace(' damage', '')
        texts[prefix + "Distance"] = texts[prefix + "Distance"].replace('Melee ', '').replace('Ranged ', '')
      }
      const ApplyGroup = (abilities, groupPrefix, limit) => {
        abilities.forEach((a, i) => {
          if(i >= limit) {
            return
          }
          const prefix = groupPrefix + (i+1)
          SetTiers(a, prefix)
          texts[prefix + "Name"] = a.name
          texts[prefix + "Target"] = a.target
          texts[prefix + "Keywords"] = a.keywords.join(', ')
          texts[prefix + "Type"] = a.type.usage
          if(a.type.trigger !== "") {
            texts[prefix + "Trigger"] = a.type.trigger
          }
          texts[prefix + "Effect"] = a.effect
          if(a.spend.length > 0) {
            texts[prefix + "Effect"] = a.effect + "\n\n[[Spend " + a.spend[0].value + "]] " + a.spend[0].effect
          }
          if(typeof(a.cost) == "number" && a.cost > 0) {
            texts[prefix + "Cost"] = a.cost
          }
          autoResizingFields.push(prefix + "Type")
          autoResizingFields.push(prefix + "Keywords")
          autoResizingFields.push(prefix + "Target")
          autoResizingFields.push(...["Tier1", "Tier2", "Tier3"].map(t => prefix + t).filter(t => texts[t]))
          markMultiline.push(...["Tier1", "Tier2", "Tier3"].map(t => prefix + t).filter(t => texts[t] && texts[t].length > 30))
        })
      }
      const abilities = HeroLogic.getAbilities(hero, true, true, false)
      const freeMelee = abilities.find(a => a.id == 'free-melee')
      SetTiers(freeMelee, "MeleeFreeStrike")
      CleanMelee("MeleeFreeStrike")
      const freeRanged = abilities.find(a => a.id == 'free-ranged')
      SetTiers(freeRanged, "RangedFreeStrike")
      CleanMelee("RangedFreeStrike")

      ApplyGroup(abilities.filter(a => a.cost == 'signature'), "Signature", 2)

      ApplyGroup(abilities.filter(a => typeof(a.cost) == 'number' && a.cost > 0 && a.type.usage == AbilityUsage.Action), "Heroic", 5)
      ApplyGroup(abilities.filter(a => typeof(a.cost) == 'number' && a.cost > 0 && a.type.usage == AbilityUsage.Trigger), "TriggeredHeroic", 1)
      ApplyGroup(abilities.filter(a => !ignoredFeatures[a.id]), "Ability", 6)
    }









    const form = pdfDoc.getForm()
    for(const field of form.getFields()) {
      if(field.constructor == PDFTextField) {
        field.disableRichFormatting()
      }
    }

    const fontAsBytes = await fetch('/forgesteel/assets/NoticiaText-Regular.ttf').then(res => res.arrayBuffer())
    pdfDoc.registerFontkit(fontkit)
    const font = await pdfDoc.embedFont(fontAsBytes)

    {
      autoResizingFields.forEach(f => {
        const field = form.getField(f)
        field.defaultUpdateAppearances(font)
        field.setFontSize(0)
      })
      markMultiline.forEach(f => form.getField(f).enableMultiline(0))
    }

    for(const [key, value] of Object.entries(texts)) {
      const field = form.getField(key)
      if(value !== null && value !== undefined) {
        field.setText(value.toString())
      }
      field.defaultUpdateAppearances(font)
    }
    for(const [key, value] of Object.entries(toggles)) {
      if(value) {
        form.getField(key).check()
      }
    }
    const data = await pdfDoc.saveAsBase64({dataUri: true})
    downloader.download = hero.name + '-character.pdf'
    downloader.href = data
    downloader.click()
  }
}
