import { PDFDocument, PDFForm, PDFField, PDFTextField, PDFName, PDFFont, StandardFontEmbedder, PDFDict, PDFRef, PDFString } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { ConditionType, ConditionEndType } from '../enums/condition-type';
import { FeatureType } from '../enums/feature-type';
import { FeatureField } from '../enums/feature-field';
import { AbilityUsage } from '../enums/ability-usage';

const fileInput = document.createElement('input');
fileInput.type = 'file';
const downloader = document.createElement('a');

export class PDFExport {
  static startExport = async (hero: unknown) => {
    const pdfAsBytes = await fetch('/forgesteel/assets/character-sheet-backer-packet-2.pdf').then(res => res.arrayBuffer())
    const pdfDoc = await PDFDocument.load(pdfAsBytes)

    const HeroLogic = (await import('../logic/hero-logic')).HeroLogic
    const FeatureLogic = (await import('../logic/feature-logic')).FeatureLogic
    const AbilityLogic = (await import('../logic/ability-logic')).AbilityLogic

    const autoResizingFields = []
    const markMultiline = []
    const sizeData = HeroLogic.getSize(hero)
    const texts = {
      'Character Name': hero.name,
      'Ancestry Top': hero.ancestry && hero.ancestry.name,
      'Career Top': hero.career && hero.career.name,
      'Class': hero.class && hero.class.name,
      'Subclass': hero.class && hero.class.subclassName + ': ' + hero.class.subclasses.filter(s => s.selected)[0].name,
      'Level': hero.class && hero.class.level,
      'Wealth': hero.state.wealth,
      'Renown': hero.state.renown,
      'XP': hero.state.xp,
      'top speed': HeroLogic.getSpeed(hero),
      'top stability': HeroLogic.getStability(hero),
      'top size': sizeData.value + sizeData.mod,
      'Current Stamina': HeroLogic.getStamina(hero) - hero.state.staminaDamage,
      'stamina max': HeroLogic.getStamina(hero),
      'winded count': Math.floor(HeroLogic.getStamina(hero) / 2),
      'dying count': -Math.floor(HeroLogic.getStamina(hero) / 2),
      'recov stamina': HeroLogic.getRecoveryValue(hero),
      'recov max': HeroLogic.getRecoveries(hero),
      'Recoveries': HeroLogic.getRecoveries(hero) - hero.state.recoveriesUsed,
      'resource name': hero.class.heroicResource,
      'Resource Count': hero.state.heroicResource,
      'Surges': hero.state.surges,
    }
    const toggles = {}

    const ignoredFeatures = {}

    {
      // Special listing because the fields weren't properly named in order
      const victoryFields = [
        'victory1',
        'victory2',
        'victory3',
        'victory4',
        'Victory 13',
        'victory5',
        'victory6',
        'victory7',
        'victory8',
        'victory9',
        'victory10',
        'victory11',
        'victory12',
        'victory14',
        'victory15'
      ]
      for(let i = 1; i <= hero.state.victories && i <= victoryFields.length; ++i) {
        toggles[victoryFields[i - 1]] = true
      }

      // might/agility/reason/intuition/presence
      for(const details of hero.class.characteristics) {
        texts['surge damage'] = Math.max(texts['surge damage'] || 0, details.value)
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
      texts['Modifier Name'] = modifiers.filter(f => f.length > 0).map(n => n[0].name).join(', ')
      autoResizingFields.push('Modifier Name')
      const modifierFields = [
        'Pip 23',
        'Pip 24',
        'Pip 25',
        'Pip 26',
        'Pip 27',
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
      texts['Modifier Benefits'] = fullDescription
      autoResizingFields.push('Modifier Benefits')

      if(kits.length > 0) {
        texts['weapon name'] = kits[0].weapon.join('/')
        texts['Armor name'] = kits[0].armor.join('/')
        speed = speed + kits[0].speed
        stability = stability + kits[0].stability
        stamina = stamina + kits[0].stamina
        area = area + kits[0].disengage
        if(kits[0].meleeDistance !== null) {
          texts['melee 2'] = '+' + kits[0].meleeDistance
        }
        if(kits[0].meleeDamage !== null) {
          texts['11b'] = '+' + kits[0].meleeDamage['tier1']
          texts['12b'] = '+' + kits[0].meleeDamage['tier1']
          texts['17b'] = '+' + kits[0].meleeDamage['tier1']
        }
        if(kits[0].rangedDistance !== null) {
          texts['Ranged 3'] = '+' + kits[0].rangedDistance
        }
        if(kits[0].rangedDamage !== null) {
          texts['11a'] = '+' + kits[0].rangedDamage['tier1']
          texts['12a'] = '+' + kits[0].rangedDamage['tier1']
          texts['17a'] = '+' + kits[0].rangedDamage['tier1']
        }
      }
      if(texts['Armor name'] == '' || texts['Armor name'] == undefined) {
        texts['Armor name'] = 'None'
      }
      if(speed > 0) {
        texts['speed 2'] = '+' + speed
      }
      if(area > 0) {
        texts['Area 2'] = '+' + area
      }
      if(stability > 0) {
        texts['Stability 2'] = '+' + stability
      }
      if(stamina > 0) {
        texts['Mod Stamina'] = '+' + stamina
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
      texts['Class Features 1'] = lines.slice(0, splitPoint).join('\n\n').replace(/\n\n\[\[/g, '\n[[')
      autoResizingFields.push('Class Features 1')
      texts['Class Features 2'] = lines.slice(splitPoint).join('\n\n').replace(/\n\n\[\[/g, '\n[[')
      if(texts['Class Features 2'] != '') {
        autoResizingFields.push('Class Features 2')
      }
    }

    {
      const ancestryTextFeatures = FeatureLogic.getFeaturesFromAncestry(hero.ancestry, hero)
      texts['Ancestry Full'] = ConvertFeatures(ancestryTextFeatures.filter(f => f.type == FeatureType.Text || f.type == FeatureType.DamageModifier))
    }

    {
      const conditionMap = {
        [ConditionType.Bleeding]: ['Pip 01', 'Pip 12'],
        [ConditionType.Dazed]: ['Pip 02', 'Pip 13'],
        [ConditionType.Frightened]: ['Pip 03', 'Pip14'],
        [ConditionType.Grabbed]: ['Pip 04', 'Pip 15'],
        [ConditionType.Prone]: ['Pip 05', 'Pip 16'],
        [ConditionType.Restrained]: ['Pip 06', 'Pip 17'],
        [ConditionType.Slowed]: ['Pip 07', 'Pip 18'],
        [ConditionType.Taunted]: ['Pip 08', 'Pip 19'],
        [ConditionType.Weakened]: ['Pip 09', 'Pip 20'],
      }
      for(const c of hero.state.conditions) {
        if(c.ends == ConditionEndType.EndOfTurn) {
          toggles[conditionMap[c.type][1]] = true
        } else if(c.end == ConditionEndType.SaveEnds) {
          toggles[conditionMap[c.type][0]] = true
        }
      }
    }

    //
    // XXX Do background stuff
    //

    {
      const SetTiers = (ability, tierKeys, powerRollKey, distanceKey) => {
        if(ability.powerRoll) {
          texts[tierKeys[0]] = AbilityLogic.getTierEffect(ability.powerRoll.tier1, 1, ability, hero)
          texts[tierKeys[1]] = AbilityLogic.getTierEffect(ability.powerRoll.tier2, 2, ability, hero)
          texts[tierKeys[2]] = AbilityLogic.getTierEffect(ability.powerRoll.tier3, 3, ability, hero)
          texts[powerRollKey] = Math.max(...ability.powerRoll.characteristic.map(c => hero.class.characteristics.find(d => d.characteristic == c).value))
        }
        texts[distanceKey] = AbilityLogic.getDistance(ability.distance[0], hero, ability)

      }
      const CleanMelee = (tierKeys, distanceKey) => {
        texts[tierKeys[0]] = texts[tierKeys[0]].replace(' damage', '')
        texts[tierKeys[1]] = texts[tierKeys[1]].replace(' damage', '')
        texts[tierKeys[2]] = texts[tierKeys[2]].replace(' damage', '')
        texts[distanceKey] = texts[distanceKey].replace('Melee ', '').replace('Ranged ', '')
      }
      const ApplyGroup = (abilities, slots) => {
        abilities.forEach((a, i) => {
          SetTiers(a, slots[i].tiers, slots[i].powerRoll, slots[i].distance)
          texts[slots[i].label] = a.name
          texts[slots[i].target] = a.target
          texts[slots[i].keywords] = a.keywords.join(', ')
          texts[slots[i].type] = a.type.usage
          texts[slots[i].effect] = a.effect
          if(slots[i].cost) {
            texts[slots[i].cost] = a.cost
          }
          autoResizingFields.push(slots[i].type)
          autoResizingFields.push(slots[i].keywords)
          autoResizingFields.push(slots[i].target)
          autoResizingFields.push(...slots[i].tiers.filter(t => texts[t]))
          markMultiline.push(...slots[i].tiers.filter(t => texts[t] && texts[t].length > 30))
        })
      }
      const abilities = HeroLogic.getAbilities(hero, true, true, false)
      const freeMelee = abilities.find(a => a.id == 'free-melee')
      SetTiers(freeMelee, ['lessthan11', 'equalto11', 'greatherthan11'], 'Power Roll 11', 'Distance 1')
      CleanMelee(['lessthan11', 'equalto11', 'greatherthan11'], 'Distance 1')
      const freeRanged = abilities.find(a => a.id == 'free-ranged')
      SetTiers(freeRanged, ['lessthan9', 'equalto9', 'greatherthan9'], 'Power Roll 9', 'Distance 4')
      CleanMelee(['lessthan9', 'equalto9', 'greatherthan9'], 'Distance 4')

      const signatureSlots = [
        {label: 'Ability Name 1', keywords: 'Keywords 1', type: 'Type 1', distance: 'Distance 2', target: 'Target 1', powerRoll: 'Power Roll 10', tiers: ['lessthan10', 'equalto10', 'greatherthan10'], effect: 'Effect 1'},
        {label: 'Ability Name 14', keywords: 'Keywords 3', type: 'Type 3', distance: 'Distance 5', target: 'Target 3', powerRoll: 'Power Roll 8', tiers: ['lessthan8', 'equalto8', 'greatherthan8'], effect: 'Effect 3'},
      ]
      ApplyGroup(abilities.filter(a => a.cost == 'signature'), signatureSlots)

      const heroicSlots = [
        {label: 'Ability Name 2', keywords: 'Keywords 2', type: 'Type 2', distance: 'Distance 3', target: 'Target 2', powerRoll: 'Power Roll 12', tiers: ['lessthan12', 'equalto12', 'greatherthan12'], effect: 'Effect 2', cost: 'Cost 1'},
        {label: 'Ability Name 3', keywords: 'Keywords 4', type: 'Type 4', distance: 'Distance 6', target: 'Target 4', powerRoll: 'Power Roll 7', tiers: ['lessthan7', 'equalto7', 'greatherthan7'], effect: 'Effect 4', cost: 'Cost 2'},
        {label: 'Ability Name 6', keywords: 'Keywords 11', type: 'Type 11', distance: 'Distance 13', target: 'Target 11', powerRoll: 'Power Roll 4', tiers: ['lessthan4', 'equalto4', 'greatherthan4'], effect: 'Effect 14', cost: 'Cost 5'},
      ]
      ApplyGroup(abilities.filter(a => typeof(a.cost) == 'number' && a.cost > 0), heroicSlots)
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
      // Workaround for PDF having 2 fields named 'Ancestry'
      const raw = form.getField('Ancestry').acroField
      const kids = raw.Kids()
      const ref0 = kids.get(0)
      const ref1 = kids.get(1)
      form.acroForm.removeField(raw)
      const newField0 = form.createTextField('Ancestry Full')
      newField0.acroField.Kids().push(ref0)
      newField0.defaultUpdateAppearances(font)
      newField0.enableMultiline()
      newField0.setFontSize(6)
      const newField1 = form.createTextField('Ancestry Top')
      newField1.acroField.Kids().push(ref1)
    }
    {
      autoResizingFields.forEach(f => form.getField(f).setFontSize(0))
      markMultiline.forEach(f => form.getField(f).enableMultiline(0))
    }
    {
      // Fix fields being multiline when they shouldn't
      form.getField('Class').disableMultiline()
      form.getField('Subclass').disableMultiline()
      form.getField('Career Top').disableMultiline()
      form.getField('Wealth').disableMultiline()
      form.getField('Renown').disableMultiline()
      form.getField('XP').disableMultiline()
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
