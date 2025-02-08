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
      const obj = PDFExport.lastObj
      const sizeData = HeroLogic.getSize(obj)
      const texts = {
        'Character Name': obj.name,
        'Ancestry Top': obj.ancestry && obj.ancestry.name,
        'Career Top': obj.career && obj.career.name,
        'Class': obj.class && obj.class.name,
        'Subclass': obj.class && obj.class.subclassName + ": " + obj.class.subclasses.filter(s => s.selected)[0].name,
        'Level': obj.class && obj.class.level,
        'Wealth': obj.state.wealth,
        'Renown': obj.state.renown,
        'XP': obj.state.xp,
        'top speed': HeroLogic.getSpeed(obj),
        'top stability': HeroLogic.getStability(obj),
        'top size': sizeData.value + sizeData.mod,
        'Current Stamina': HeroLogic.getStamina(obj) - obj.state.staminaDamage,
        'stamina max': HeroLogic.getStamina(obj),
        'winded count': Math.floor(HeroLogic.getStamina(obj) / 2),
        'dying count': -Math.floor(HeroLogic.getStamina(obj) / 2),
        'recov stamina': HeroLogic.getRecoveryValue(obj),
        'recov max': HeroLogic.getRecoveries(obj),
        'Recoveries': HeroLogic.getRecoveries(obj) - obj.state.recoveriesUsed,
        'resource name': obj.class.heroicResource,
        'Resource Count': obj.state.heroicResource,
        'Surges': obj.state.surges,
      }
      const toggles = {}

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
      for(let i = 1; i <= obj.state.victories && i <= victoryFields.length; ++i) {
        toggles[victoryFields[i - 1]] = true
      }

      // might/agility/reason/intuition/presence
      for(const details of obj.class.characteristics) {
        texts['surge damage'] = Math.max(texts['surge damage'] || 0, details.value)
        texts[details.characteristic] = details.value
      }

      const features = HeroLogic.getFeatures(obj)
      {
        const kits = HeroLogic.getKits(obj)
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
                if(fullDescription != "") {
                  fullDescription = fullDescription + "\n\n"
                }
                fullDescription = fullDescription + feature.name + ":\n" + feature.description
              } else if(feature.type == FeatureType.Multiple) {
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

      //const abilities = HeroLogic.getAbilities(obj, false, true, true)









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
      downloader.download = obj.name + "-character.pdf"
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
