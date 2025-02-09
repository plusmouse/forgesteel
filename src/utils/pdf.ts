import { PDFDocument, PDFForm, PDFField, PDFTextField } from 'pdf-lib';
import { FeatureType } from '../enums/feature-type';
import { FeatureField } from '../enums/feature-field';

const fileInput = document.createElement('input');
fileInput.type = 'file';
const downloader = document.createElement('a');

export class PDFExport {
  static fieldMaps = {
  }
  private lastObj: unknown

  static startExport = (obj: unknown) => {
    PDFExport.lastObj = obj
    fileInput.click()
  }
  static continueExport = async (file: unknown) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      const pdfDoc = await PDFDocument.load(e.target.result)

      const HeroLogic = (await import('../logic/hero-logic')).HeroLogic
      const FeatureLogic = (await import('../logic/feature-logic')).FeatureLogic
      const hero = PDFExport.lastObj
      const sizeData = HeroLogic.getSize(hero)
      const texts = {
        'Character Name': hero.name,
        'Ancestry Top': hero.ancestry && hero.ancestry.name,
        'Career Top': hero.career && hero.career.name,
        'Class': hero.class && hero.class.name,
        'Subclass': hero.class && hero.class.subclassName + ": " + hero.class.subclasses.filter(s => s.selected)[0].name,
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
          features.filter(f => f.name.match("Enchantment of")),
          features.filter(f => f.name.match("Prayer of")),
          features.filter(f => f.name.match(" Augmentation")),
          features.filter(f => f.name.match("Ward of"))
        ]
        texts["Modifier Name"] = modifiers.filter(f => f.length > 0).map(n => n[0].name).join(", ")
        const modifierFields = [
          "Pip 23",
          "Pip 24",
          "Pip 25",
          "Pip 26",
          "Pip 27",
        ]
        let fullDescription = ""
        let [speed, area, stability, stamina] = [0, 0, 0, 0]

        for(let i = 0; i < modifiers.length; ++i) {
          if(modifiers[i].length > 0) {
            toggles[modifierFields[i]] = true
            for(let feature of modifiers[i]) {
              if(feature.type == FeatureType.Text) {
                ignoredFeatures[feature.id] = true
                if(fullDescription != "") {
                  fullDescription = fullDescription + "\n\n"
                }
                fullDescription = fullDescription + "==" + feature.name + "==" + "\n" + feature.description
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
        texts["Modifier Benefits"] = fullDescription

        if(kits.length > 0) {
          texts["weapon name"] = kits[0].weapon.join("/")
          texts["Armor name"] = kits[0].armor.join("/")
          speed = speed + kits[0].speed
          stability = stability + kits[0].stability
          stamina = stamina + kits[0].stamina
          area = area + kits[0].disengage
          if(kits[0].meleeDistance !== null) {
            texts["melee 2"] = "+" + kits[0].meleeDistance
          }
          if(kits[0].meleeDamage !== null) {
            texts["11b"] = "+" + kits[0].meleeDamage["tier1"]
            texts["12b"] = "+" + kits[0].meleeDamage["tier1"]
            texts["17b"] = "+" + kits[0].meleeDamage["tier1"]
          }
          if(kits[0].rangedDistance !== null) {
            texts["Ranged 3"] = "+" + kits[0].rangedDistance
          }
          if(kits[0].rangedDamage !== null) {
            texts["11a"] = "+" + kits[0].rangedDamage["tier1"]
            texts["12a"] = "+" + kits[0].rangedDamage["tier1"]
            texts["17a"] = "+" + kits[0].rangedDamage["tier1"]
          }
        }
        if(texts["Armor name"] == "" || texts["Armor name"] == undefined) {
          texts["Armor name"] = "None"
        }
        if(speed > 0) {
          texts["speed 2"] = "+" + speed
        }
        if(area > 0) {
          texts["Area 2"] = "+" + area
        }
        if(stability > 0) {
          texts["Stability 2"] = "+" + stability
        }
        if(stamina > 0) {
          texts["Mod Stamina"] = "+" + stamina
        }
      }

      {
        // Roughly split the features between the boxes, with a bias for the
        // first box, no abilities, only description-only features
        const classTextFeatures = FeatureLogic.getFeaturesFromClass(hero.class, hero).filter(f => f.type == FeatureType.Text).filter(f => !ignoredFeatures[f.id])
        let all = ""
        for(const feature of classTextFeatures) {
          if(all != "") {
            all = all + "\n\n"
          }
          // substitution is to convert any tables into text that presents
          // better in the PDF form
          all = all + "==" + feature.name + "==" + "\n\n" + feature.description.replace(/(\|\:\-+)+\|\n/g, "").replace(/\|\s+(.+?)\s+\| (.+?)\s+\|/g, "$1 | $2")
        }
        const lines = all.split(/\n+/)
        const halfway = Math.ceil((lines.length + 1)/ 2)
        texts["Class Features 1"] = lines.slice(0, halfway).join("\n\n")
        texts["Class Features 2"] = lines.slice(halfway).join("\n\n")
      }









      const form = pdfDoc.getForm()
      for(const field of form.getFields()) {
        if(field.constructor == PDFTextField) {
          field.disableRichFormatting()
        }
      }

      {
        // Workaround for PDF having 2 fields named "Ancestry"
        const raw = form.getField("Ancestry").acroField
        const kids = raw.Kids()
        const ref0 = kids.get(0)
        const ref1 = kids.get(1)
        form.acroForm.removeField(raw)
        const newField0 = form.createTextField("Ancestry Full")
        newField0.acroField.Kids().push(ref0)
        const newField1 = form.createTextField("Ancestry Top")
        newField1.acroField.Kids().push(ref1)
      }
      {
        form.getField("Modifier Name").setFontSize(0)
        form.getField("Modifier Benefits").setFontSize(0)
        form.getField("Class Features 1").setFontSize(0)
        if(texts["Class Features 2"] != "") {
          form.getField("Class Features 2").setFontSize(0)
        }
      }

      for(const [key, value] of Object.entries(texts)) {
        if(value !== null && value !== undefined) {
          form.getField(key).setText(value.toString())
        }
      }
      for(const [key, value] of Object.entries(toggles)) {
        if(value) {
          form.getField(key).check()
        }
      }
      const data = await pdfDoc.saveAsBase64({dataUri: true})
      downloader.download = hero.name + "-character.pdf"
      downloader.href = data
      downloader.click()
    }
    reader.readAsArrayBuffer(file)
  }
}

fileInput.addEventListener('change', (event) => {
    const selectedFile = (event.target as HTMLInputElement).files[0];
    if (selectedFile) {
      PDFExport.continueExport(selectedFile)
    }
});
fileInput.click();
