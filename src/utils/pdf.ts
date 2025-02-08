import { PDFDocument, PDFForm, PDFField, PDFTextField } from 'pdf-lib';

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
      const kits = HeroLogic.getKits(obj)
      const modifiers = [
        kits.map(f => f.name),
        features.filter(f => f.name.match("Enchantment of")).map(f => f.name.replace("Enchantment of ", "Ench: ")),
        features.filter(f => f.name.match("Prayer of")).map(f => f.name.replace("Prayer of ", "Prayer: ")),
        features.filter(f => f.name.match(" Augmentation")).map(f => ("Augmentation: " + f.name.replace(" Augmentation", ""))),
        features.filter(f => f.name.match("Ward of")).map(f => f.name.replace("Ward of ", "Ward: "))
      ]
      const modifierFields = [
        "Pip 23",
        "Pip 24",
        "Pip 25",
        "Pip 26",
        "Pip 27",
      ]
      let modifierLabel = ""
      for(let i = 0; i < modifiers.length; ++i) {
        const mod = modifiers[i]
        const field = modifierFields[i]
        if(mod.length > 0) {
          if(modifierLabel == "") {
            modifierLabel = mod[0]
          }
          else {
            modifierLabel = modifierLabel + ", " + mod[0]
          }
          toggles[field] = true
        }
      }
      texts["Modifier Name"] = modifierLabel

      if(kits.length > 0) {
        texts["weapon name"] = kits[0].weapon.join("/")
        texts["Armor name"] = kits[0].armor.join("/")
        texts["speed 2"] = "+" + kits[0].speed
        texts["Stability 2"] = "+" + kits[0].stability
        texts["Mod Stamina"] = "+" + kits[0].stamina
        texts["Area 2"] = "+" + kits[0].disengage
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
        newField0.addToPage(pdfDoc.getPage(0))
        const newField1 = form.createTextField("Ancestry Top")
        newField1.acroField.Kids().push(ref1)
        newField1.addToPage(pdfDoc.getPage(0))
      }

      for(const [key, value] of Object.entries(texts)) {
        if(value) {
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
