_MCHAT_QUESTIONS = [
    ('mchat_01', 'Seu filho gosta de ser balançado, de pular no seu joelho etc.?'),
    ('mchat_02', 'Seu filho tem interesse por outras crianças?'),
    ('mchat_03', 'Seu filho gosta de subir em coisas, como escadas ou móveis?'),
    ('mchat_04', 'Seu filho gosta de brincar de esconder e mostrar o rosto ou de esconde-esconde?'),
    ('mchat_05', 'Seu filho já brincou de faz-de-conta (por exemplo, falar ao telefone ou cuidar de uma boneca)?'),
    ('mchat_06', 'Seu filho já usou o dedo indicador para apontar e pedir alguma coisa?'),
    ('mchat_07', 'Seu filho já usou o dedo indicador para apontar e indicar interesse em algo?'),
    ('mchat_08', 'Seu filho consegue brincar corretamente com brinquedos pequenos (por exemplo, carrinhos ou blocos)?'),
    ('mchat_09', 'Seu filho já trouxe objetos para mostrar a você apenas por querer mostrar?'),
    ('mchat_10', 'Seu filho olha para você nos olhos por mais de um ou dois segundos?'),
    ('mchat_11', 'Seu filho já pareceu muito sensível a barulhos (por exemplo, tapando os ouvidos ou chorando)?'),
    ('mchat_12', 'Seu filho sorri em resposta ao seu rosto ou ao seu sorriso?'),
    ('mchat_13', 'Seu filho imita você (por exemplo, fazer caretas ou copiar gestos)?'),
    ('mchat_14', 'Seu filho responde quando você o chama pelo nome?'),
    ('mchat_15', 'Se você aponta um brinquedo do outro lado do cômodo, seu filho olha para ele?'),
    ('mchat_16', 'Seu filho já sabe andar?'),
    ('mchat_17', 'Seu filho olha para coisas que você está olhando?'),
    ('mchat_18', 'Seu filho faz movimentos estranhos com os dedos perto do rosto?'),
    ('mchat_19', 'Seu filho tenta atrair a sua atenção para a atividade dele?'),
    ('mchat_20', 'Você alguma vez já se perguntou se seu filho é surdo?'),
    ('mchat_21', 'Seu filho entende o que as pessoas dizem?'),
    ('mchat_22', 'Seu filho às vezes fica aéreo, olhando para o nada ou caminhando sem direção definida?'),
    ('mchat_23', 'Seu filho olha para o seu rosto para conferir a sua reação quando vê algo estranho?'),
]

_MCHAT_RISK_YES = {'mchat_11', 'mchat_18', 'mchat_20', 'mchat_22'}
_MCHAT_CRITICAL = {'mchat_02', 'mchat_07', 'mchat_09', 'mchat_13', 'mchat_14', 'mchat_15'}

DIAGNOSTIC_AXES = [
    {
        'id': 'mchat',
        'label': 'M-CHAT',
        'questions': [
            {
                'id': question_id,
                'text': question_text,
                'risk_answer': 'yes' if question_id in _MCHAT_RISK_YES else 'no',
                'critical': question_id in _MCHAT_CRITICAL,
            }
            for question_id, question_text in _MCHAT_QUESTIONS
        ],
    },
]


DIAGNOSTIC_QUESTIONS = [
    {
        **question,
        'axis': axis['label'],
    }
    for axis in DIAGNOSTIC_AXES
    for question in axis['questions']
]

DIAGNOSTIC_RECOMMENDATIONS = {
    'severe': 'Risco alto segundo M-CHAT. Recomenda-se encaminhamento imediato para avaliação especializada multidisciplinar.',
    'moderate': 'Risco moderado segundo M-CHAT. Reaplique o M-CHAT com entrevista de seguimento e monitore intervenções precoces.',
    'mild': 'Baixo risco segundo M-CHAT. Continue acompanhamento do desenvolvimento e repita o rastreio periodicamente.',
}
