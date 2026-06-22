import React, { useState } from 'react'
import { Text } from 'react-native'
import Card from '../components/Card'
import FormField from '../components/FormField'
import PrimaryButton from '../components/PrimaryButton'
import Screen from '../components/Screen'

export default function AssistantScreen({ session }) {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const hasAssistantAccess = session.user.permissions.includes('admin.all') || session.user.permissions.includes('ai.chat')

  const respond = () => {
    setAnswer(
      'Asistente movil preparado. En V1 productiva este chat consultara la API central respetando permisos del usuario.',
    )
  }

  return (
    <Screen title="Asistente IA" subtitle="Consulta guiada del ERP">
      <Card title="Acceso">
        <Text>
          {hasAssistantAccess
            ? 'Asistente disponible para tu perfil.'
            : 'Tu perfil no tiene acceso al asistente IA.'}
        </Text>
      </Card>
      <Card title="Pregunta">
        <FormField label="Consulta" value={question} onChangeText={setQuestion} multiline />
        <PrimaryButton title="Consultar" onPress={respond} disabled={!question.trim() || !hasAssistantAccess} />
      </Card>
      {answer ? (
        <Card title="Respuesta">
          <Text>{answer}</Text>
        </Card>
      ) : null}
    </Screen>
  )
}
